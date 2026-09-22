import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
  HttpMiddleware,
} from '@effect/platform'
import { Config, Context, Effect, Layer, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { NodeHttpServer } from '@effect/platform-node'
import { createServer } from 'node:http'

import * as AlgoliaSearchClient from '@fact-check-database/core-vendor/algolia/AlgoliaSearchClient'
import {
  StorageObjectAttributesSchema,
  PubsubMessageEnvelope,
} from '@fact-check-database/core-contracts/gcp/v1'
import { StorageReader } from '@fact-check-database/core-io'

import { transcodeBatch } from './transcodeBatch'

export interface ServiceContext {
  indexName: string
}

export const ServiceContext =
  Context.GenericTag<ServiceContext>('ServiceContext')

const decodePubsubMessageEnvelope = Schema.decodeUnknown(PubsubMessageEnvelope)

const decodeAttributes = StorageObjectAttributesSchema.pipe(
  Schema.pick('bucketId', 'objectId'),
  Schema.decodeUnknown
)

const loadJobs = HttpRouter.post(
  '/load-jobs',
  Effect.gen(function* () {
    const ctx = yield* ServiceContext
    const reader = yield* StorageReader
    const req = yield* HttpServerRequest.HttpServerRequest

    const body = yield* req.json
    const { message } = yield* decodePubsubMessageEnvelope(body)
    const attributes = yield* decodeAttributes(message.attributes)

    const data = yield* reader.read({
      object: attributes.objectId,
      bucket: attributes.bucketId,
    })

    const objects = yield* transcodeBatch(data)

    // start a batch load job and await its completion
    yield* AlgoliaSearchClient.saveObjects({
      indexName: ctx.indexName,
      objects,
      waitForTasks: true,
    })

    // return a 201 response to the subscription
    return yield* HttpServerResponse.json(
      {
        message: 'Batch load job submitted',
      },
      { status: StatusCodes.CREATED }
    )
  }).pipe(
    Effect.tapErrorCause(Effect.logError),
    Effect.catchTags({
      AlgoliaSearchClientIOError: () =>
        HttpServerResponse.json(
          {
            message: 'Something went wrong submitting the batch load job',
          },
          { status: StatusCodes.INTERNAL_SERVER_ERROR }
        ),
      StorageReadError: () =>
        HttpServerResponse.json(
          {
            message: 'Something went wrong reading the batch from storage',
          },
          { status: StatusCodes.INTERNAL_SERVER_ERROR }
        ),
      ParseError: () =>
        HttpServerResponse.json(
          {
            message: 'Something went wrong decoding the batch',
          },
          { status: StatusCodes.INTERNAL_SERVER_ERROR }
        ),
    })
  )
)

const router = HttpRouter.empty.pipe(loadJobs)

const app = router.pipe(
  HttpServer.serve(HttpMiddleware.logger),
  HttpServer.withLogAddress
)

const server = Layer.unwrapEffect(
  Effect.gen(function* () {
    const port = yield* Config.number('PORT')
    return NodeHttpServer.layer(() => createServer(), { port })
  })
)

export const Program = Layer.provide(app, server).pipe(
  Layer.launch,
  Effect.tapErrorCause(Effect.logError)
)
