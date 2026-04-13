import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
  HttpBody,
} from '@effect/platform'
import { NodeHttpServer } from '@effect/platform-node'
import { createServer } from 'node:http'
import { Config, Effect, Layer, pipe, Queue, Schema } from 'effect'

import { IngestionAttempted } from '@news-research/ingestion/ingest'
import { Node } from '@news-research/ingestion/util'

import { MessageQueue } from '../../MessageQueue'

const decodeIngestionAttempted = pipe(
  IngestionAttempted,
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
      return yield* Effect.async(
        (
          resume: (
            cb: Effect.Effect<
              HttpServerResponse.HttpServerResponse,
              HttpBody.HttpBodyError
            >
          ) => void
        ) =>
          Effect.asVoid(
            Queue.offer(messages, {
              read: decodeIngestionAttempted(body),
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
