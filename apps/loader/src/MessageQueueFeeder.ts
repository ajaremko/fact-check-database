import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
  HttpBody,
} from '@effect/platform'
import { NodeHttpServer } from '@effect/platform-node'
import { createServer } from 'node:http'
import { Config, Effect, Layer, Schema, pipe } from 'effect'

import { MessageQueue } from '@news-research/ingestion/messaging'
import { Node } from '@news-research/ingestion/util'

const decodeMessage = Schema.decodeUnknown(
  Schema.Struct({
    message: Schema.Struct({
      data: Schema.String,
    }),
  })
)

const decodeData = pipe(
  Schema.String,
  Node.parseBufferEncoded({ decode: 'base64', encode: 'utf-8' }),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode // reverse target and source to decode from string to Buffer
)

const router = HttpRouter.empty.pipe(
  HttpRouter.post(
    '/',
    Effect.gen(function* () {
      const { messages } = yield* MessageQueue.MessageQueue
      const req = yield* HttpServerRequest.HttpServerRequest

      const body = yield* req.json
      const { message } = yield* decodeMessage(body)
      const data = yield* decodeData(message.data)

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
              resume(HttpServerResponse.json({}, { status: 200 }))
            ),
            nack: Effect.sync(() =>
              resume(HttpServerResponse.json({}, { status: 400 }))
            ),
          })
        )
      )
    }).pipe(
      Effect.catchTags({
        ParseError: () => HttpServerResponse.json({}, { status: 400 }),
        RequestError: () => HttpServerResponse.json({}, { status: 400 }),
      })
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

export const layer = Layer.provide(app, server)
