import {
  HttpRouter,
  HttpServer,
  HttpServerRequest,
  HttpServerResponse,
} from '@effect/platform'
import { Cause, Config, Effect, Layer, Option, Schema } from 'effect'
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

/** The client-facing message for each way a load request can fail. */
function failureMessage(tag: string): string {
  switch (tag) {
    case 'BigQueryClientIOError':
      return 'Something went wrong submitting the batch load job'
    case 'StorageReadError':
      return 'Something went wrong reading the batch schema from storage'
    case 'ParseError':
      return 'Something went wrong decoding the batch or schema'
    case 'RequestError':
      return 'Something went wrong reading the request'
    default:
      return 'Something went wrong loading the batch'
  }
}

/**
 * Handles one Pub/Sub push delivery: reads the batch's table schema, loads
 * the batch into BigQuery and responds `201`. Any failure is logged once, at
 * `error`, and answered with a `500` so Pub/Sub redelivers the message.
 *
 * Every log line for the request carries the annotations set here, including
 * library `debug`/`trace` lines emitted while the request runs.
 */
const handleLoadRequest = Effect.gen(function* () {
  const ctx = yield* ServiceContext
  const req = yield* HttpServerRequest.HttpServerRequest
  yield* Effect.annotateLogsScoped({
    'batch.datasetId': ctx.datasetId,
    'batch.tableId': ctx.tableId,
  })

  return yield* Effect.gen(function* () {
    const body = yield* req.json
    const { message, subscription, deliveryAttempt } =
      yield* decodePubsubMessageEnvelope(body)
    yield* Effect.annotateLogsScoped({
      'message.messageId': message.messageId,
      subscription,
    })
    if (deliveryAttempt !== undefined) {
      yield* Effect.annotateLogsScoped({
        'message.deliveryAttempt': deliveryAttempt,
      })
    }
    yield* Effect.logInfo('Load request received')
    if (deliveryAttempt !== undefined && deliveryAttempt > 1) {
      yield* Effect.logWarning('Message redelivered')
    }

    const attributes = yield* decodeAttributes(message.attributes)
    yield* Effect.annotateLogsScoped({
      'batch.bucket': attributes.bucketId,
      'batch.object': attributes.objectId,
      'batch.generation': attributes.objectGeneration,
      'schema.object': attributes.schemaObjectId,
    })

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
    yield* Effect.logInfo('Batch loaded')

    // return a 201 response to the subscription
    return yield* HttpServerResponse.json(
      {
        message: 'Batch load job submitted',
      },
      { status: StatusCodes.CREATED }
    )
  }).pipe(
    Effect.catchAllCause((cause) => {
      const tag = Option.match(Cause.failureOption(cause), {
        onNone: () => 'Defect',
        onSome: (error) => error._tag,
      })
      return Effect.logError('Load request failed', cause).pipe(
        Effect.annotateLogs({
          'error._tag': tag,
          'response.status': StatusCodes.INTERNAL_SERVER_ERROR,
        }),
        Effect.andThen(
          HttpServerResponse.json(
            { message: failureMessage(tag) },
            { status: StatusCodes.INTERNAL_SERVER_ERROR }
          )
        )
      )
    })
  )
}).pipe(Effect.scoped, Effect.withLogSpan('loadRequest'))

/** Routes Pub/Sub push deliveries to {@link handleLoadRequest}. */
export const router = HttpRouter.empty.pipe(
  HttpRouter.post('/load-jobs', handleLoadRequest)
)

const app = router.pipe(HttpServer.serve(), HttpServer.withLogAddress)

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
  Effect.tapErrorCause((cause) => Effect.logFatal('Server stopped', cause))
)
