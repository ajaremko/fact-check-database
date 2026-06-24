import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
  HttpBody,
} from '@effect/platform'
import { Config, Effect, Layer, Record, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { NodeHttpServer } from '@effect/platform-node'
import { createServer } from 'node:http'

import * as Node from '@news-research/core-data/Node'

import { MessageQueue } from '../MessageQueue'

const decodeMessage = Schema.decodeUnknown(
  Schema.Struct({
    message: Schema.Struct({
      messageId: Schema.String,
      data: Schema.String.pipe(
        Node.parseBufferEncoded({ decode: 'utf-8', encode: 'base64' })
      ),
    }),
  })
)

function process(data: Buffer) {
  return Effect.gen(function* () {
    const { messages } = yield* MessageQueue
    const span = yield* Effect.currentSpan
    const annotations = yield* Effect.logAnnotations.pipe(
      Effect.map(Record.fromEntries)
    )
    return yield* Effect.asyncEffect<
      HttpServerResponse.HttpServerResponse,
      HttpBody.HttpBodyError,
      never,
      never,
      never,
      never
    >((resume) =>
      Effect.asVoid(
        messages.offer({
          data,
          ack: Effect.sync(() =>
            resume(
              HttpServerResponse.json(
                {
                  message: 'Message processed',
                },
                { status: StatusCodes.CREATED }
              )
            )
          ),
          nack: Effect.sync(() =>
            resume(
              HttpServerResponse.json(
                {
                  message: 'Failed to process message, please retry',
                },
                { status: StatusCodes.INTERNAL_SERVER_ERROR }
              )
            )
          ),
          span,
          annotations,
        })
      )
    )
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
        return yield* process(data).pipe(
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
