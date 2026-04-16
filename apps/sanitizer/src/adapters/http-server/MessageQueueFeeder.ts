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

import { IngestionAttempted } from '@news-research/ingestion/ingest'
import { Node } from '@news-research/ingestion/util'

import { MessageQueue } from '../../MessageQueue'

const decodeMessage = Schema.decodeUnknown(
  Schema.Struct({
    message: Schema.Struct({
      data: Schema.String,
    }),
  })
)

const decodeIngestionAttempted = pipe(
  IngestionAttempted,
  Node.parseJson(),
  Node.parseBufferEncoded({ decode: 'utf-8', encode: 'base64' }),
  Schema.decode
)

const router = HttpRouter.empty.pipe(
  HttpRouter.post(
    '/',
    Effect.gen(function* () {
      const { messages } = yield* MessageQueue
      const req = yield* HttpServerRequest.HttpServerRequest
      const body = yield* req.json
      console.log('Received message:', body)
      const { message } = yield* decodeMessage(body)
      console.log(
        'Received message data:',
        Buffer.from(message.data, 'base64').toString('utf-8')
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
            read: decodeIngestionAttempted(message.data),
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
