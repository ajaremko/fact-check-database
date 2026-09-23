import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
  HttpMiddleware,
} from '@effect/platform'
import { Config, Effect, Layer, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { NodeHttpServer } from '@effect/platform-node'
import { createServer } from 'node:http'

import {
  StorageObjectAttributesSchema,
  PubsubMessageEnvelope,
} from '@fact-check-database/core-contracts/gcp/v1'

import { ServiceContext, provideServiceContext } from './config'
import { readSchema, provideSchemaReader } from './readSchema'
import { loadBatch } from './loadBatch'

const decodePubsubMessageEnvelope = Schema.decodeUnknown(PubsubMessageEnvelope)

const decodeAttributes = StorageObjectAttributesSchema.pipe(
  Schema.pick('bucketId', 'objectId', 'objectGeneration'),
  Schema.extend(
    Schema.Struct({
      schemaObjectId: Schema.String,
    })
  ),
  Schema.decodeUnknown
)

const loadJobs = HttpRouter.post(
  '/load-jobs',
  Effect.gen(function* () {
    const ctx = yield* ServiceContext
    const req = yield* HttpServerRequest.HttpServerRequest

    const body = yield* req.json
    const { message } = yield* decodePubsubMessageEnvelope(body)
    const attributes = yield* decodeAttributes(message.attributes)

    const schema = yield* readSchema({
      object: attributes.schemaObjectId,
      bucket: attributes.bucketId,
    })

    // start a batch load job and await its completion
    yield* loadBatch({
      projectId: ctx.projectId,
      pointer: {
        bucket: attributes.bucketId,
        object: attributes.objectId,
      },
      generation: attributes.objectGeneration,
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      table: {
        dataset: ctx.datasetId,
        table: ctx.tableId,
      },
      schema,
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
      BigQueryClientIOError: () =>
        HttpServerResponse.json(
          {
            message: 'Something went wrong submitting the batch load job',
          },
          { status: StatusCodes.INTERNAL_SERVER_ERROR }
        ),
      StorageReadError: () =>
        HttpServerResponse.json(
          {
            message:
              'Something went wrong reading the batch schema from storage',
          },
          { status: StatusCodes.INTERNAL_SERVER_ERROR }
        ),
      ParseError: () =>
        HttpServerResponse.json(
          {
            message: 'Something went wrong decoding the batch or schema',
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

export const App = Layer.provide(app, server).pipe(
  Layer.launch,
  provideSchemaReader,
  provideServiceContext,
  Effect.tapErrorCause(Effect.logError)
)
