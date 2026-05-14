import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
  HttpBody,
} from '@effect/platform'
import { Config, Effect, Layer, Schema } from 'effect'
import { NodeHttpServer } from '@effect/platform-node'
import { createServer } from 'node:http'

import * as Node from '@news-research/ingestion-data/Node'

import { MessageQueue } from '../MessageQueue'

const decodeMessage = Schema.decodeUnknown(
  Schema.Struct({
    message: Schema.Struct({
      data: Schema.String.pipe(
        Node.parseBufferEncoded({ decode: 'utf-8', encode: 'base64' })
      ),
    }),
  })
)

function process(id: string, data: Buffer) {
  return Effect.gen(function* () {
    const { messages } = yield* MessageQueue
    const span = yield* Effect.currentSpan
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
            resume(HttpServerResponse.json({}, { status: 201 }))
          ),
          nack: Effect.sync(() =>
            resume(
              HttpServerResponse.json(
                {
                  message: 'Failed to process message, please retry',
                },
                { status: 400 }
              )
            )
          ),
          span,
        })
      )
    )
  }).pipe(Effect.withSpan(id))
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
        return yield* process(req.url, data)
      }).pipe(
        Effect.catchTags({
          ParseError: () => HttpServerResponse.json({}, { status: 400 }),
          RequestError: () => HttpServerResponse.json({}, { status: 400 }),
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
