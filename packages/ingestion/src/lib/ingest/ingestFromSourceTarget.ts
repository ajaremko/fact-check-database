import { Clock, Effect, Either } from 'effect'

import { Node } from '@news-research/node'

import {
  DataFetchedRecord,
  IngestionRecordMetadata,
  NoResponseRecord,
  FilePointer,
  archiveBaseDir,
} from '../data'

import { Fetcher, FetchResult, FetchSuccess } from './Fetcher'
import { IngestionAttempted } from './IngestionAttempted'
import { Archiver } from './Archiver'
import { SourceTarget } from './SourceTarget'

function createNoResponseRecord(
  runId: string,
  fetchedAt: number,
  source: SourceTarget,
  error: string
) {
  return NoResponseRecord({
    runId,
    fetchedAt,
    url: source.url,
    source: {
      name: source.name,
      collection: source.collection,
    },
    error,
  })
}

function createDataFetchedRecord(
  runId: string,
  fetchedAt: number,
  source: SourceTarget,
  response: FetchSuccess,
  pointer: FilePointer
) {
  return DataFetchedRecord({
    runId,
    fetchedAt,
    url: source.url,
    source: {
      name: source.name,
      collection: source.collection,
    },
    http: {
      status: response.status,
      contentType: response.contentType,
      etag: response.etag,
      lastModified: response.lastModified,
      headers: response.headers,
    },
    content: {
      sha256: response.sha256,
      bytes: response.bytes,
    },
    pointer,
  })
}

function createMetadata(
  runId: string,
  fetchedAt: number,
  source: SourceTarget
): IngestionRecordMetadata {
  return {
    id: runId,
    url: source.url,
    sourceName: source.name,
    sourceCollection: source.collection,
    runId,
    fetchedAt,
  }
}

function createIngestionAttempted(
  runId: string,
  fetchedAt: number,
  source: SourceTarget,
  result: FetchResult,
  pointer: FilePointer // pointer to META json
): Effect.Effect<IngestionAttempted> {
  return Effect.gen(function* () {
    const components = Either.match(result, {
      onLeft: (r) => [
        `url=${source.url}`,
        `t=${fetchedAt}`,
        `error=${r.error}`,
      ],
      onRight: (r) => [`url=${source.url}`, `sha256=${r.sha256}`],
    })
    const base = [`v1`, ...components].join('|')
    const observationId = yield* Node.sha256Hex(base, 'utf8')

    return Either.match(result, {
      onLeft: (r) => ({
        observationId,
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
        error: r.error,
        pointer,
      }),
      onRight: (r) => ({
        observationId,
        runId,
        fetchedAt,
        url: source.url,
        finalUrl: r.finalUrl,
        source: {
          name: source.name,
          collection: source.collection,
        },
        http: {
          status: r.status,
          contentType: r.contentType,
          etag: r.etag,
          lastModified: r.lastModified,
        },
        content: {
          sha256: r.sha256,
          bytes: r.bytes,
        },
        error: undefined,
        pointer,
      }),
    })
  })
}

export function ingestFromSourceTarget(
  runId: string,
  source: SourceTarget,
  index: number
) {
  return Effect.gen(function* () {
    yield* Effect.logInfo(`Processing target ${index + 1}`)

    const archive = yield* Archiver
    const fetcher = yield* Fetcher
    const fetchedAt = yield* Clock.currentTimeMillis

    const result = yield* fetcher.fetch(source.url)

    const path = archiveBaseDir(source.name, fetchedAt, runId)

    if (Either.isLeft(result)) {
      // In case of fetch failure, archive the attempt
      // record without archiving response body
      const id = yield* Effect.sync(
        () => `${fetchedAt}_${Math.random().toString(16).slice(2)}`
      )
      const record = createNoResponseRecord(
        runId,
        fetchedAt,
        source,
        result.left.error
      )
      const meta = createMetadata(runId, fetchedAt, source)
      const recordPointer = yield* archive.archiveRecord(path, id, record, meta)
      return yield* createIngestionAttempted(
        runId,
        fetchedAt,
        source,
        result,
        recordPointer
      )
    } else {
      // If fetch is successful, archive both the response
      // body and the attempt record
      const id = result.right.sha256
      const bodyPointer = yield* archive.archiveBody(
        path,
        id,
        result.right.body,
        result.right.contentType
      )
      const record = createDataFetchedRecord(
        runId,
        fetchedAt,
        source,
        result.right,
        bodyPointer
      )
      const meta = createMetadata(runId, fetchedAt, source)
      const recordPointer = yield* archive.archiveRecord(path, id, record, meta)
      return yield* createIngestionAttempted(
        runId,
        fetchedAt,
        source,
        result,
        recordPointer
      )
    }
  }).pipe(
    Effect.tapError(Effect.logError),
    Effect.annotateLogs({
      source: source.name,
      url: source.url,
      collection: source.collection,
    })
  )
}
