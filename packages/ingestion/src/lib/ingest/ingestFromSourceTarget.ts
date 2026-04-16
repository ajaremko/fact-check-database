import { Clock, Effect, Schema, flow, pipe } from 'effect'

import {
  ArchivePathSchema,
  IngestionRecordMetadataSchema,
  IngestionRecordSchema,
} from '../data'
import { Node, Yaml } from '../util'
import { StorageWriter } from '../ports'

import { Fetcher, FetchFailure, FetchSuccess } from './Fetcher'
import { IngestionAttempted } from './IngestionAttempted'
import { SourceTarget } from './SourceTarget'
import { ObservationIdSchema } from './ObservationId'

const encodeIngestionRecord = pipe(
  IngestionRecordSchema,
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

const encodeIngestionRecordMetadata = Schema.encode(
  IngestionRecordMetadataSchema
)

const encodeArchivePath = Schema.encode(ArchivePathSchema)

function writeFetchFailureRecord(input: {
  observationId: string
  ingestionId: string
  source: SourceTarget
  fetchedAt: number
  result: FetchFailure
}) {
  return Effect.gen(function* () {
    const storageWriter = yield* StorageWriter

    // Write a record of the failed attempt, without a pointer
    // or content fields since there is no body to archive
    const recordPath = yield* encodeArchivePath({
      version: 1,
      ingestionId: input.ingestionId,
      collectionName: 'records',
      ext: 'ingestion.yml',
      sourceName: input.source.name,
      observationId: input.observationId,
      date: input.fetchedAt,
    })
    const recordData = yield* encodeIngestionRecord({
      version: 1,
      kind: 'fetch_attempt',
      outcome: 'no_response',
      observationId: input.observationId,
      ingestionId: input.ingestionId,
      fetchedAt: input.fetchedAt,
      url: input.source.url,
      source: {
        name: input.source.name,
        collection: input.source.collection,
      },
      error: input.result.error,
    })
    const recordMeta = yield* encodeIngestionRecordMetadata({
      observationId: input.observationId,
      url: input.source.url,
      sourceName: input.source.name,
      sourceCollection: input.source.collection,
      ingestionId: input.ingestionId,
      fetchedAt: input.fetchedAt,
    })
    return yield* storageWriter.write({
      path: recordPath,
      data: recordData,
      meta: recordMeta,
      contentType: 'application/yaml',
    })
  }).pipe(
    Effect.annotateLogs({
      result: input.result.type,
    })
  )
}

function writeDataFetchedRecord(input: {
  id: string
  runId: string
  source: SourceTarget
  fetchedAt: number
  result: FetchSuccess
}) {
  return Effect.gen(function* () {
    const storageWriter = yield* StorageWriter

    // Write the raw response body to the archive
    const bodyPath = yield* encodeArchivePath({
      version: 1,
      sourceName: input.source.name,
      collectionName: 'raw',
      ext: 'bin',
      date: input.fetchedAt,
      ingestionId: input.runId,
      observationId: input.id,
    })
    const bodyPointer = yield* storageWriter.write({
      path: bodyPath,
      data: input.result.body,
      contentType: input.result.contentType,
    })

    // Write a record of the successful attempt, including a
    // pointer to the archived body
    const recordPath = yield* encodeArchivePath({
      version: 1,
      ingestionId: input.runId,
      collectionName: 'records',
      ext: 'ingestion.yml',
      sourceName: input.source.name,
      observationId: input.id,
      date: input.fetchedAt,
    })
    const recordData = yield* encodeIngestionRecord({
      version: 1,
      kind: 'fetch_attempt',
      outcome: 'data_fetched',
      ingestionId: input.runId,
      fetchedAt: input.fetchedAt,
      url: input.source.url,
      source: {
        name: input.source.name,
        collection: input.source.collection,
      },
      http: {
        status: input.result.status,
        contentType: input.result.contentType,
        etag: input.result.etag,
        lastModified: input.result.lastModified,
        headers: input.result.headers,
      },
      content: {
        sha256: input.result.sha256,
        bytes: input.result.bytes,
      },
      pointer: bodyPointer,
    })
    const recordMeta = yield* encodeIngestionRecordMetadata({
      observationId: input.id,
      url: input.source.url,
      sourceName: input.source.name,
      sourceCollection: input.source.collection,
      ingestionId: input.runId,
      fetchedAt: input.fetchedAt,
    })
    return yield* storageWriter.write({
      path: recordPath,
      data: recordData,
      meta: recordMeta,
      contentType: 'application/yaml',
    })
  }).pipe(
    Effect.annotateLogs({
      result: input.result.type,
    })
  )
}

const encodeHashedObservationId = flow(
  Schema.encode(ObservationIdSchema),
  Effect.andThen((base) => Node.sha256Hex(base, 'utf8'))
)

export function ingestFromSourceTarget(input: {
  runId: string
  source: SourceTarget
  index: number
}) {
  return Effect.gen(function* () {
    yield* Effect.logInfo(`Processing target ${input.index + 1}`)

    const fetcher = yield* Fetcher
    const fetchedAt = yield* Clock.currentTimeMillis
    const result = yield* fetcher.fetch(input.source)

    if (result.type === 'failure') {
      // Derive a stable observation ID from failure
      const id = yield* encodeHashedObservationId({
        version: 1,
        url: input.source.url,
        fetchedAt: fetchedAt,
        error: result.error,
      })
      // write a record of the failed attempt, without a pointer
      const recordPointer = yield* writeFetchFailureRecord({
        observationId: id,
        ingestionId: input.runId,
        source: input.source,
        fetchedAt,
        result,
      })
      // Return an `IngestionAttempted` event with error details
      // and pointer to the attempt record, but no content fields
      // since there is no body to archive
      return new IngestionAttempted({
        observationId: id,
        runId: input.runId,
        fetchedAt,
        url: input.source.url,
        source: {
          name: input.source.name,
          collection: input.source.collection,
        },
        http: {
          status: 0,
        },
        content: {
          sha256: undefined,
          bytes: undefined,
        },
        error: result.error,
        pointer: recordPointer,
      })
    }
    // Derive a stable observation ID from the success
    const id = yield* encodeHashedObservationId({
      version: 1,
      url: input.source.url,
      sha256: result.sha256,
    })
    // Write a record of the successful attempt, including a
    // pointer to the archived body
    const recordPointer = yield* writeDataFetchedRecord({
      id,
      runId: input.runId,
      source: input.source,
      fetchedAt,
      result,
    })
    // Return an `IngestionAttempted` event with details of
    // the attempt and pointer to the attempt record, which
    // references the archived body
    return new IngestionAttempted({
      observationId: id,
      runId: input.runId,
      fetchedAt,
      url: input.source.url,
      finalUrl: result.finalUrl,
      source: {
        name: input.source.name,
        collection: input.source.collection,
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
      source: input.source.name,
      url: input.source.url,
      collection: input.source.collection,
    })
  )
}
