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

import * as Node from '@news-research/core-data/Node'

import { GCSNotificationSchema } from './GCSNotification'
import { loadBatch } from './loadBatch'

export interface ServiceContext {
  projectId: string
  datasetId: string
  tableId: string
}

export const ServiceContext =
  Context.GenericTag<ServiceContext>('ServiceContext')

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

const decodeGCSNotification = GCSNotificationSchema.pipe(
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

const loadJobs = HttpRouter.post(
  '/load-jobs',
  Effect.gen(function* () {
    // access bigquery constants
    const ctx = yield* ServiceContext
    // access request body
    const req = yield* HttpServerRequest.HttpServerRequest
    const body = yield* req.json
    // decode notification from gcs that a new batch
    // is ready to be loaded into bigquery
    const { message } = yield* decodeMessage(body)
    const data = Buffer.from(message.data, 'utf-8')
    const notification = yield* decodeGCSNotification(data)
    // start a batch load job and await its completion
    yield* loadBatch({
      projectId: ctx.projectId,
      pointer: {
        bucket: notification.bucket,
        object: notification.name,
      },
      sourceFormat: notification.contentType,
      table: {
        dataset: ctx.datasetId,
        table: ctx.tableId,
      },
      schema: notification.metadata,
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

export const Program = Layer.launch(Layer.provide(app, server))
