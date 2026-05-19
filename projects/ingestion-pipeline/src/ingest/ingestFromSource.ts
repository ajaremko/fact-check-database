import { Effect, Schema, Metric, flow, pipe, MetricBoundaries } from 'effect'
import { StatusCodes } from 'http-status-codes'

import * as Node from '@news-research/ingestion-data/Node'
import * as Yaml from '@news-research/ingestion-data/Yaml'
import { omitNullKeys } from '@news-research/ingestion-data'

import {
  SourceEncoded,
  TimestampEncoded,
  TimestampSchema,
  SourceSchema,
  writeFile,
} from '../shared'

import {
  Observation,
  ObservationSchema,
  ObservationMetadataSchema,
  ObservationPathSchema,
  ObservationEventSchema,
} from './Observation'
import { FetchedBodySchema, FetchedBodyPathSchema } from './FetchedBody'
import { ObservationIdSchema } from './ObservationId'
import { fetch } from './Fetcher'

const encodeObservation = pipe(
  ObservationSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeObservationMetadata = Schema.encode(ObservationMetadataSchema)
const encodeObservationPath = Schema.encode(ObservationPathSchema)
const encodeFetchedBodyPath = Schema.encode(FetchedBodyPathSchema)
const encodeObservationEvent = Schema.encode(ObservationEventSchema)

const encodeHashedObservationId = flow(
  Schema.encode(ObservationIdSchema),
  Effect.andThen((base) => Node.sha256Hex(base, 'utf8'))
)

const decodeContext = Schema.decodeUnknownSync(
  Schema.Struct({
    ingestionId: Schema.String,
    source: SourceSchema,
    timestamp: TimestampSchema,
  })
)

const requestCounter = Metric.counter('ingestFromSource.requests', {
  description: 'Counts the number of requests made to all sources',
})

const statusCodes = Object.values(StatusCodes).filter(
  (code): code is number => typeof code === 'number'
)

const requestResponseCodes = Metric.histogram(
  'ingestFromSource.responseCodes',
  MetricBoundaries.fromIterable(statusCodes)
)

const fetchFailures = Metric.counter('ingestFromSource.fetchFailures', {
  description: 'Counts the number of failed fetches',
})

export const ingestFromSource = Effect.fn('ingestFromSource')(
  function* (args: {
    ingestionId: string
    timestamp: TimestampEncoded
    source: SourceEncoded
  }) {
    const ctx = decodeContext(args)

    yield* Effect.logTrace('Fetching data from source target')
    const result = yield* fetch(ctx.source, ctx.timestamp)
    // Increment the request counter for monitoring
    yield* Metric.increment(requestCounter)

    // Derive a stable observation ID from fetch result
    const observationId = yield* encodeHashedObservationId({
      source: ctx.source,
      result,
      fetchedAt: ctx.timestamp,
    })

    if (result._tag === 'FetchFailure') {
      // Record the failure for monitoring purposes
      yield* Effect.logWarning(`Fetch failed: ${result.error}`)
      yield* Metric.increment(fetchFailures)
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

      // Return an `ObservationIngested` event with error details
      // and pointer to the attempt record, but no content fields
      // since there is no body to archive
      return yield* encodeObservationEvent({
        observation,
        pointer: recordPointer,
      })
    }

    // Record the response code for both successes and failures to
    // allow monitoring of source health
    yield* requestResponseCodes(Effect.succeed(result.status))

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
    yield* Effect.logTrace('Writing fetch success record')
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

    // Return an `IngestionAttempted` event with details of
    // the attempt and pointer to the attempt record, which
    // references the archived body
    return yield* encodeObservationEvent({
      observation,
      pointer: recordPointer,
    })
  },
  (effect, args) =>
    effect.pipe(
      Effect.annotateLogs({
        'source.id': args.source.id,
        'source.name': args.source.name,
        'source.url': args.source.url,
        'source.collection': args.source.collection,
      })
    )
)
