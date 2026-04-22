import { Effect, Schema, flow, pipe } from 'effect'

import { Node, Yaml } from '../../util'
import { StorageWriter } from '../../ports'

import * as Fetcher from './Fetcher'
import {
  RawObservation,
  RawObservationSchema,
  RawObservationMetadataSchema,
  RawObservationPathSchema,
} from './RawObservation'
import { FetchedBody, FetchedBodyPathSchema } from './FetchedBody'
import { ObservationIdSchema } from './ObservationId'
import { ObservationIngested } from './ObservationIngested'

const encodeRawObservation = pipe(
  RawObservationSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeRawObservationMetadata = Schema.encode(RawObservationMetadataSchema)
const encodeRawObservationPath = Schema.encode(RawObservationPathSchema)
const encodeFetchedBodyPath = Schema.encode(FetchedBodyPathSchema)

const encodeHashedObservationId = flow(
  Schema.encode(ObservationIdSchema),
  Effect.andThen((base) => Node.sha256Hex(base, 'utf8'))
)

export function ingestFromSourceTarget(ctx: {
  ingestionId: string
  fetchedAt: number
  source: {
    name: string
    collection: string
    url: string
  }
}) {
  return Effect.gen(function* () {
    yield* Effect.logDebug('Fetching data from source target')
    const result = yield* Fetcher.fetch(ctx.source)
    // Derive a stable observation ID from fetch result
    const observationId = yield* encodeHashedObservationId(result)

    if (result._tag === 'FetchFailure') {
      // For a failed fetch, we won't have a body to archive,
      // so we can skip straight to creating an observation
      // with no pointer to a body
      const observation = new RawObservation({
        observationId,
        ingestionId: ctx.ingestionId,
        result,
        pointer: null,
      })
      // Encode to a record of the failed attempt, without a
      // pointer
      yield* Effect.logDebug('Writing fetch failure record')
      const recordPath = yield* encodeRawObservationPath(observation)
      const recordData = yield* encodeRawObservation(observation)
      const recordMeta = yield* encodeRawObservationMetadata(observation)
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
      return new ObservationIngested({
        observationId,
        runId: ctx.ingestionId,
        fetchedAt: ctx.fetchedAt,
        url: ctx.source.url,
        pointer: recordPointer,
        error: result.error,
        source: {
          name: ctx.source.name,
          collection: ctx.source.collection,
        },
        http: {
          status: 0,
        },
        content: {
          sha256: undefined,
          bytes: undefined,
        },
      })
    }
    // For a successful fetch, we need to archive the body
    const fetchedBody = new FetchedBody({
      observationId,
      ingestionId: ctx.ingestionId,
      fetchedAt: ctx.fetchedAt,
      sourceName: ctx.source.name,
      body: result.body,
      contentType: result.contentType,
    })
    // Write the raw response body to the archive
    yield* Effect.logDebug('Writing raw response body')
    const bodyPath = yield* encodeFetchedBodyPath(fetchedBody)
    // write the body to storage
    const bodyPointer = yield* StorageWriter.writeFile({
      path: bodyPath,
      data: fetchedBody.body,
      contentType: fetchedBody.contentType,
    })
    // We have archived the body so we create an
    // observation with a pointer to the body
    const observation = new RawObservation({
      observationId,
      ingestionId: ctx.ingestionId,
      result,
      pointer: bodyPointer,
    })
    // Write a record of the successful attempt, including a
    // pointer to the archived body
    yield* Effect.logDebug('Writing fetch success record')
    const recordPath = yield* encodeRawObservationPath(observation)
    const recordData = yield* encodeRawObservation(observation)
    const recordMeta = yield* encodeRawObservationMetadata(observation)
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
    return new ObservationIngested({
      observationId,
      runId: ctx.ingestionId,
      fetchedAt: ctx.fetchedAt,
      url: ctx.source.url,
      finalUrl: result.finalUrl,
      source: {
        name: ctx.source.name,
        collection: ctx.source.collection,
      },
      http: {
        status: result.status,
        contentType: result.contentType,
        etag: result.etag,
        lastModified: result.lastModified,
      },
      content: {
        sha256: result.sha256,
        bytes: result.bytes,
      },
      error: undefined,
      pointer: recordPointer,
    })
  }).pipe(
    Effect.annotateLogs({
      source: ctx.source.name,
      url: ctx.source.url,
      collection: ctx.source.collection,
    }),
    Effect.withSpan('ingestFromSourceTarget')
  )
}
