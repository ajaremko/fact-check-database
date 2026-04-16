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

import { ExtractionBatchReady } from '@news-research/ingestion/extract'
import { Node } from '@news-research/ingestion/util'

import { MessageQueue } from './MessageQueue'

const decodeMessage = pipe(
  Schema.Struct({
    message: Schema.Struct({
      data: Schema.String,
    }),
  }),
  Node.parseJson(),
  Schema.decodeUnknown
)

const decodeExtractionBatchReady = pipe(
  ExtractionBatchReady,
  Node.parseJson(),
  Schema.decodeUnknown
)

// Define the router with a single route for the root URL
const router = HttpRouter.empty.pipe(
  HttpRouter.post(
    '/',
    Effect.gen(function* () {
      const { messages } = yield* MessageQueue
      const req = yield* HttpServerRequest.HttpServerRequest
      const body = yield* req.json
      const { message } = yield* decodeMessage(body)
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
            read: decodeExtractionBatchReady(message.data),
            ack: Effect.sync(() =>
              resume(HttpServerResponse.json({}, { status: 200 }))
            ),
            nack: Effect.sync(() =>
              resume(HttpServerResponse.json({}, { status: 400 }))
            ),
          })
        )
      )
    })
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
