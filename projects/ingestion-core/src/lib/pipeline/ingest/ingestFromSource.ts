import { Effect, Schema, flow, pipe } from 'effect'

import { Node, omitNullKeys, Yaml } from '../../data'

import {
  StorageWriter,
  SourceEncoded,
  TimestampEncoded,
  TimestampSchema,
  SourceSchema,
} from '../shared'

import * as Fetcher from './Fetcher'
import {
  Observation,
  ObservationSchema,
  ObservationMetadataSchema,
  ObservationPathSchema,
  ObservationEventSchema,
} from './Observation'
import { FetchedBodySchema, FetchedBodyPathSchema } from './FetchedBody'
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

export function ingestFromSource(args: {
  ingestionId: string
  timestamp: TimestampEncoded
  source: SourceEncoded
}) {
  return Effect.gen(function* () {
    const ctx = decodeContext(args)

    yield* Effect.logDebug('Fetching data from source target')
    const result = yield* Fetcher.fetch(ctx.source, ctx.timestamp)

    // Derive a stable observation ID from fetch result
    const observationId = yield* encodeHashedObservationId({
      source: ctx.source,
      result,
      fetchedAt: ctx.timestamp,
    })

    if (result._tag === 'FetchFailure') {
      yield* Effect.logWarning(`Fetch failed: ${result.error}`)
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
      yield* Effect.logDebug('Writing fetch failure record')
      const recordPath = yield* encodeObservationPath(observation)
      const recordData = yield* encodeObservation(observation)
      const recordMeta = yield* encodeObservationMetadata(observation)

      // write the record to storage
      const recordPointer = yield* StorageWriter.writeFile({
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
    yield* Effect.logDebug('Writing raw response body')
    const bodyPath = yield* encodeFetchedBodyPath(fetchedBody)

    // write the body to storage
    const bodyPointer = yield* StorageWriter.writeFile(
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
    yield* Effect.logDebug('Writing fetch success record')
    const recordPath = yield* encodeObservationPath(observation)
    const recordData = yield* encodeObservation(observation)
    const recordMeta = yield* encodeObservationMetadata(observation)

    // write the record to storage
    const recordPointer = yield* StorageWriter.writeFile({
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
  }).pipe(
    Effect.annotateLogs({
      source: args.source.name,
      url: args.source.url,
      collection: args.source.collection,
    }),
    Effect.withSpan('ingestFromSourceTarget')
  )
}
