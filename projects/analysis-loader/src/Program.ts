import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
  HttpMiddleware,
} from '@effect/platform'
import { Config, Context, Effect, Layer, Schema, flow } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { NodeHttpServer } from '@effect/platform-node'
import { createServer } from 'node:http'

import * as Node from '@news-research/core-data/Node'
import { readFile } from '@news-research/core-io'
import {
  StorageObjectAttributesSchema,
  PubsubMessagePayload,
} from '@news-research/core-contracts'

import { loadBatch } from './loadBatch'

export interface ServiceContext {
  projectId: string
  datasetId: string
  tableId: string
}

export const ServiceContext =
  Context.GenericTag<ServiceContext>('ServiceContext')

const decodeSchema = Schema.Object.pipe(
  Node.parseJson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const makeSchemaReader = Effect.map(
  Effect.cachedFunction(
    flow(readFile, Effect.andThen(decodeSchema), Effect.withSpan('readSchema'))
  ),
  (read) => ({ read })
)

type SchemaReader = Effect.Effect.Success<typeof makeSchemaReader>

const SchemaReader = Context.GenericTag<SchemaReader>('SchemaReader')

const provideSchemaReader = Effect.provideServiceEffect(
  SchemaReader,
  makeSchemaReader
)

const decodeMessage = Schema.decodeUnknown(PubsubMessagePayload)

const decodeAttributes = StorageObjectAttributesSchema.pipe(
  Schema.pick('bucketId', 'objectId'),
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
    const reader = yield* SchemaReader
    const req = yield* HttpServerRequest.HttpServerRequest

    const body = yield* req.json
    const { message } = yield* decodeMessage(body)
    const attributes = yield* decodeAttributes(message.attributes)

    const schema = yield* reader.read({
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
    Effect.catchTag('BigQueryClientIOError', () =>
      HttpServerResponse.json(
        {
          message: 'Something went wrong submitting the batch load job',
        },
        { status: StatusCodes.INTERNAL_SERVER_ERROR }
      )
    )
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
  provideSchemaReader,
  Effect.tapErrorCause(Effect.logError)
)
