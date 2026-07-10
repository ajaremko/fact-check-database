import { Effect, Schema, Metric, flow, pipe } from 'effect'
import { getReasonPhrase } from 'http-status-codes'

import * as Node from '@news-research/core-data/Node'
import * as Yaml from '@news-research/core-data/Yaml'
import {
  TimestampEncoded,
  TimestampSchema,
} from '@news-research/ingestion-contracts/shared/v1'
import {
  SourceConfigEncoded,
  SourceConfigSchema,
} from '@news-research/ingestion-contracts/config/v1'
import { omitNullKeys } from '@news-research/core-data'
import { writeFile } from '@news-research/core-io'

import { fetch } from '../ports/Fetcher'

import {
  Observation,
  ObservationSchema,
  ObservationMetadataSchema,
  ObservationPathSchema,
} from './Observation'
import { FetchedBodySchema, FetchedBodyPathSchema } from './FetchedBody'
import { logIngestionFailed, logIngestionSucceeded } from './logging'
import { ObservationIdSchema } from './ObservationId'

const encodeObservation = pipe(
  ObservationSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeObservationMetadata = Schema.encode(ObservationMetadataSchema)
const encodeObservationPath = Schema.encode(ObservationPathSchema)
const encodeFetchedBodyPath = Schema.encode(FetchedBodyPathSchema)

const encodeHashedObservationId = flow(
  Schema.encode(ObservationIdSchema),
  Effect.andThen((base) => Node.sha256Hex(base, 'utf8'))
)

const decodeContext = Schema.decodeUnknownSync(
  Schema.Struct({
    ingestionId: Schema.String,
    source: SourceConfigSchema,
    timestamp: TimestampSchema,
  })
)

const contentRequestResults = Metric.counter('content_request_results')

export const ingestFromSource = Effect.fn('ingestFromSource')(
  function* (args: {
    ingestionId: string
    timestamp: TimestampEncoded
    source: SourceConfigEncoded
  }) {
    const ctx = decodeContext(args)

    yield* Effect.logTrace('Fetching data from source target')
    const result = yield* fetch(ctx.source, ctx.timestamp)

    // Derive a stable observation ID from fetch result
    const observationId = yield* encodeHashedObservationId({
      source: ctx.source,
      result,
      fetchedAt: ctx.timestamp,
    })

    if (result._tag === 'FetchFailure') {
      // Record the failure for monitoring purposes
      yield* logIngestionFailed({
        event: 'fetch_failure',
        'result.error': String(result.error),
      })

      yield* Metric.increment(contentRequestResults).pipe(
        Effect.tagMetrics({
          result_status: 'Client Failure',
          result_status_code: 'N/A',
          result_content_type: 'N/A',
        })
      )
      // For a failed fetch, we won't have a body to archive,
      // so we can skip straight to creating an observation
      // with no pointer to a body
      const observation = new Observation({
        observationId,
        ingestionId: ctx.ingestionId,
        source: ctx.source,
        fetchedAt: ctx.timestamp,
        result,
        pointer: null,
      })

      // Encode to a record of the failed attempt, without a pointer
      yield* Effect.logTrace('Writing fetch failure record')
      const recordPath = yield* encodeObservationPath(observation)
      const recordData = yield* encodeObservation(observation)
      const recordMeta = yield* encodeObservationMetadata(observation)

      // write the record to storage
      const recordPointer = yield* writeFile({
        path: recordPath,
        data: recordData,
        meta: recordMeta,
        contentType: 'application/yaml',
      })

      // Return a pointer to the attempt record, since there is no body to archive
      return recordPointer
    }

    // For a successful fetch, we need to archive the body
    const fetchedBody = FetchedBodySchema.make({
      observationId,
      ingestionId: ctx.ingestionId,
      fetchedAt: ctx.timestamp,
      sourceName: ctx.source.name,
      body: result.body,
      contentType: result.contentType,
    })

    // Write the raw response body to the archive
    yield* Effect.logTrace('Writing raw response body')
    const bodyPath = yield* encodeFetchedBodyPath(fetchedBody)

    // write the body to storage
    const bodyPointer = yield* writeFile(
      omitNullKeys({
        path: bodyPath,
        data: fetchedBody.body,
        contentType: fetchedBody.contentType,
      })
    )

    // We have archived the body so we create an
    // observation with a pointer to the body
    const observation = new Observation({
      observationId,
      ingestionId: ctx.ingestionId,
      source: ctx.source,
      fetchedAt: ctx.timestamp,
      result,
      pointer: bodyPointer,
    })

    // Write a record of the successful attempt, including a
    // pointer to the archived body
    yield* logIngestionSucceeded({
      event: 'fetch_success',
      'result.status': getReasonPhrase(result.status),
      'result.status_code': result.status,
      'result.content_type': result.contentType || 'unknown',
    })

    const recordPath = yield* encodeObservationPath(observation)
    const recordData = yield* encodeObservation(observation)
    const recordMeta = yield* encodeObservationMetadata(observation)

    // write the record to storage
    const recordPointer = yield* writeFile({
      path: recordPath,
      data: recordData,
      meta: recordMeta,
      contentType: 'application/yaml',
    })

    // Record the response code for sent requests to
    // allow monitoring of source health
    yield* Metric.increment(contentRequestResults).pipe(
      Effect.tagMetrics({
        result_status: `${getReasonPhrase(result.status)}`,
        result_status_code: String(result.status),
        result_content_type: result.contentType || 'unknown',
      })
    )

    // Return a pointer to the attempt record, which
    // references the archived body
    return recordPointer
  },
  (effect, args) =>
    effect.pipe(
      Effect.annotateLogs({
        'source.id': args.source.id,
        'source.name': args.source.name,
        'source.url': args.source.url,
        'source.collection': args.source.collection,
      }),
      Effect.tagMetrics({
        source_name: args.source.name,
        source_collection: args.source.collection,
      })
    )
)
