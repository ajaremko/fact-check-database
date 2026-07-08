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

import { PubsubMessagePayload } from '@news-research/core-contracts'

import { MessageBody } from '../MessageBody'

import { enqueueAndAwaitOutcome } from './internal/enqueueAndAwaitOutcome'

const decodeMessage = Schema.decodeUnknown(PubsubMessagePayload)

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

export function layer(path: HttpRouter.PathInput) {
  const router = HttpRouter.empty.pipe(
    HttpRouter.post(
      path,
      Effect.gen(function* () {
        const req = yield* HttpServerRequest.HttpServerRequest
        const body = yield* req.json
        const { message } = yield* decodeMessage(body)
        const data = Buffer.from(message.data, 'utf-8')
        const messageBody: MessageBody = {
          data,
          attributes: message.attributes,
          messageId: message.messageId,
          publishTime: message.publishTime,
        }
        return yield* enqueueHttpMessage(messageBody).pipe(
          Effect.withSpan('processHttpRequest'),
          Effect.annotateLogs({
            'request.url': req.url,
            'request.method': req.method,
            'message.id': message.messageId,
          })
        )
      }).pipe(
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
        }),
        Effect.withSpan('HttpServerMessageQueueFeeder', { root: true })
      )
    )
  )

  const app = router.pipe(HttpServer.serve(), HttpServer.withLogAddress)

  const server = Layer.unwrapEffect(
    Effect.gen(function* () {
      const port = yield* Config.number('PORT')
      return NodeHttpServer.layer(() => createServer(), { port })
    })
  )

  return Layer.provide(app, server)
}
