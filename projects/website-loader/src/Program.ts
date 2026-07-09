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
import * as Ndjson from '@news-research/core-data/Ndjson'
import * as AlgoliaSearchClient from '@news-research/core-vendor/algolia/AlgoliaSearchClient'
import { StorageReader } from '@news-research/core-io'
import {
  StorageObjectAttributesSchema,
  PubsubMessageEnvelope,
  FactChecksTableRowSchema,
} from '@news-research/core-contracts'

export interface ServiceContext {
  indexName: string
}

export const ServiceContext =
  Context.GenericTag<ServiceContext>('ServiceContext')

const decodeBatch = FactChecksTableRowSchema.pipe(
  Ndjson.parseNdjson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

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

    const batch = yield* decodeBatch(data)

    yield* Effect.logInfo(`Submitting batch load job with ${batch.length} rows`)

    // start a batch load job and await its completion
    yield* AlgoliaSearchClient.saveObjects({
      indexName: ctx.indexName,
      objects: batch.map((row) => ({
        ObjectID: row.content_lineage_id,
        content_type: row.http.content_type,
        content_length: row.http.etag,
        final_url: row.http.final_url,
        extracted_at: row.extracted_at,
        source_collection: row.source.collection,
        source_id: row.source.id,
        source_url: row.source.url,
        source_name: row.source.name,
        canonical_url: row.fact_check.canonical_url,
        claim: row.fact_check.claim,
        language: row.fact_check.language,
        link: row.fact_check.link,
        published_at_normalized: row.fact_check.published_at_normalized,
        published_at_raw: row.fact_check.published_at_raw,
        summary: row.fact_check.summary,
        title: row.fact_check.title,
        verdict_normalized: row.fact_check.verdict_normalized,
        verdict_raw: row.fact_check.verdict_raw,
      })),
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
    Effect.catchTag('AlgoliaSearchClientIOError', () =>
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
  Effect.tapErrorCause(Effect.logError)
)
