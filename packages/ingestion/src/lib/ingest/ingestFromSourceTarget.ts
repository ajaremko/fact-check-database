import { Clock, Effect, Schema, flow, pipe } from 'effect'

import {
  ArchivePathSchema,
  IngestionRecordMetadataSchema,
  IngestionRecordSchema,
} from '../data'
import { Node, Yaml } from '../util'
import { StorageWriter } from '../ports'

import { Fetcher } from './Fetcher'
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

const encodeHashedObservationId = flow(
  Schema.encode(ObservationIdSchema),
  Effect.andThen((base) => Node.sha256Hex(base, 'utf8'))
)

export function ingestFromSourceTarget(
  runId: string,
  source: SourceTarget,
  index: number
) {
  return Effect.gen(function* () {
    yield* Effect.logInfo(`Processing target ${index + 1}`)

    const storageWriter = yield* StorageWriter
    const fetcher = yield* Fetcher
    const fetchedAt = yield* Clock.currentTimeMillis

    const result = yield* fetcher.fetch(source)

    if (result.type === 'failure') {
      // Derive a stable observation ID from failure
      const id = yield* encodeHashedObservationId({
        version: 1,
        url: source.url,
        fetchedAt: fetchedAt,
        error: result.error,
      })

      // Write a record of the failed attempt, without a pointer
      // or content fields since there is no body to archive
      const recordPath = yield* encodeArchivePath({
        version: 1,
        runId,
        collectionName: 'records',
        ext: 'ingestion.yml',
        sourceName: source.name,
        id,
        date: fetchedAt,
      })
      const recordData = yield* encodeIngestionRecord({
        version: 1,
        kind: 'fetch_attempt',
        outcome: 'no_response',
        runId,
        fetchedAt,
        url: source.url,
        source: {
          name: source.name,
          collection: source.collection,
        },
        error: result.error,
      })
      const recordMeta = yield* encodeIngestionRecordMetadata({
        id,
        url: source.url,
        sourceName: source.name,
        sourceCollection: source.collection,
        runId,
        fetchedAt,
      })
      const recordPointer = yield* storageWriter.write({
        path: recordPath,
        data: recordData,
        meta: recordMeta,
        contentType: 'application/yaml',
      })

      // Return an `IngestionAttempted` event with error details
      // and pointer to the attempt record, but no content fields
      // since there is no body to archive
      return new IngestionAttempted({
        observationId: id,
        runId,
        fetchedAt,
        url: source.url,
        source: {
          name: source.name,
          collection: source.collection,
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
      url: source.url,
      sha256: result.sha256,
    })

    // Write the raw response body to the archive
    const bodyPath = yield* encodeArchivePath({
      version: 1,
      sourceName: source.name,
      collectionName: 'raw',
      ext: 'bin',
      date: fetchedAt,
      runId,
      id,
    })
    const bodyPointer = yield* storageWriter.write({
      path: bodyPath,
      data: result.body,
      contentType: result.contentType,
    })

    // Write a record of the successful attempt, including a
    // pointer to the archived body
    const recordPath = yield* encodeArchivePath({
      version: 1,
      runId,
      collectionName: 'records',
      ext: 'ingestion.yml',
      sourceName: source.name,
      id,
      date: fetchedAt,
    })
    const recordData = yield* encodeIngestionRecord({
      version: 1,
      kind: 'fetch_attempt',
      outcome: 'data_fetched',
      runId,
      fetchedAt,
      url: source.url,
      source: {
        name: source.name,
        collection: source.collection,
      },
      http: {
        status: result.status,
        contentType: result.contentType,
        etag: result.etag,
        lastModified: result.lastModified,
        headers: result.headers,
      },
      content: {
        sha256: result.sha256,
        bytes: result.bytes,
      },
      pointer: bodyPointer,
    })
    const recordMeta = yield* encodeIngestionRecordMetadata({
      id,
      url: source.url,
      sourceName: source.name,
      sourceCollection: source.collection,
      runId,
      fetchedAt,
    })
    const recordPointer = yield* storageWriter.write({
      path: recordPath,
      data: recordData,
      meta: recordMeta,
      contentType: 'application/yaml',
    })

    // Return an `IngestionAttempted` event with details of
    // the attempt and pointer to the attempt record, which
    // references the archived body
    return new IngestionAttempted({
      observationId: id,
      runId,
      fetchedAt,
      url: source.url,
      finalUrl: result.finalUrl,
      source: {
        name: source.name,
        collection: source.collection,
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
      source: source.name,
      url: source.url,
      collection: source.collection,
    })
  )
}
