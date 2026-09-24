import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from '@effect/platform'
import { Config, Effect, Layer, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { NodeHttpServer } from '@effect/platform-node'
import { createServer } from 'node:http'

import * as Node from '@fact-check-database/core-data/Node'
import {
  PubsubMessageEnvelope,
  parsePubsubMessagePayloadData,
} from '@fact-check-database/core-contracts/gcp/v1'

import { MessageBody } from '../ports/types/MessageBody'

import { enqueueAndAwaitOutcome } from '../internal/enqueueAndAwaitOutcome'

const adapter = 'HttpServerMessageQueueFeeder'

const decodePubsubMessagePayload = Schema.decodeUnknown(PubsubMessageEnvelope)

const decodePubsubMessagePayloadData = Schema.String.pipe(
  parsePubsubMessagePayloadData,
  Schema.decodeUnknown
)

const encodeMessageData = Schema.String.pipe(
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeUnknown
)

/**
 * Offers `message` onto the {@link MessageQueue} and awaits its outcome,
 * responding 201 if acked or 500 if nacked so the caller knows whether to
 * retry the HTTP request.
 */
function enqueueHttpMessage(message: MessageBody) {
  return enqueueAndAwaitOutcome({
    message,
    onAck: HttpServerResponse.json(
      { message: 'Message processed' },
      { status: StatusCodes.CREATED }
    ),
    onNack: HttpServerResponse.json(
      { message: 'Failed to process message, please retry' },
      { status: StatusCodes.INTERNAL_SERVER_ERROR }
    ),
  })
}

/**
 * Builds a {@link MessageQueue} feeder layer that accepts messages via an
 * HTTP POST route mounted at `path`. Production adapter — the push-based
 * ingestion entry point for services that receive pushed events (e.g. a
 * Pub/Sub push subscription) rather than pulling from one directly.
 *
 * The request body is decoded against the `PubsubMessagePayload` schema; a
 * decode failure responds 400, a successful decode is forwarded to
 * {@link enqueueHttpMessage}. Reads `PORT` to bind the underlying HTTP
 * server.
 */
export function layer(path: HttpRouter.PathInput) {
  const handleRequest = Effect.gen(function* () {
    const req = yield* HttpServerRequest.HttpServerRequest
    yield* Effect.annotateLogsScoped({
      adapter,
      'request.url': req.url,
      'request.method': req.method,
    })

    const response = yield* Effect.gen(function* () {
      const body = yield* req.json
      const payload = yield* decodePubsubMessagePayload(body)
      yield* Effect.annotateLogsScoped({
        'message.messageId': payload.message.messageId,
      })
      const messageData = yield* decodePubsubMessagePayloadData(
        payload.message.data
      )
      const data = yield* encodeMessageData(messageData)
      const messageBody: MessageBody = {
        data,
        attributes: payload.message.attributes,
        messageId: payload.message.messageId,
        publishTime: payload.message.publishTime,
      }
      return yield* enqueueHttpMessage(messageBody).pipe(
        Effect.withSpan('processHttpRequest')
      )
    }).pipe(
      // Only the error tag is logged: parse errors embed the offending payload
      Effect.tapError((error) =>
        Effect.logDebug('Request rejected').pipe(
          Effect.annotateLogs({ 'error._tag': error._tag })
        )
      ),
      Effect.catchTags({
        NoSuchElementException: () =>
          HttpServerResponse.json(
            {
              message: 'Missing required field in request body',
            },
            { status: StatusCodes.BAD_REQUEST }
          ),
        ParseError: () =>
          HttpServerResponse.json(
            {
              message: 'Invalid request body',
            },
            { status: StatusCodes.BAD_REQUEST }
          ),
        RequestError: () =>
          HttpServerResponse.json(
            {
              message: 'Request error',
            },
            { status: StatusCodes.BAD_REQUEST }
          ),
      })
    )

    yield* Effect.annotateLogsScoped({ 'response.status': response.status })
    yield* Effect.logTrace('Request handled')

    return response
  }).pipe(
    Effect.scoped,
    Effect.withSpan('HttpServerMessageQueueFeeder', { root: true })
  )

  const router = HttpRouter.empty.pipe(HttpRouter.post(path, handleRequest))

  const app = router.pipe(HttpServer.serve(), HttpServer.withLogAddress)

  const server = Layer.unwrapEffect(
    Effect.gen(function* () {
      const port = yield* Config.number('PORT')
      return NodeHttpServer.layer(() => createServer(), { port })
    })
  )

  return Layer.provide(app, server)
}
