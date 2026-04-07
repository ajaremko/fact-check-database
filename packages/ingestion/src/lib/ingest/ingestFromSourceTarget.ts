import { Clock, Effect, Either } from 'effect'

import {
  DataFetchedRecord,
  IngestionRecordMetadata,
  NoResponseRecord,
  FilePointer,
  archiveBaseDir,
} from '../data'
import { IngestionAttempted } from './IngestionAttempted'
import { Node } from '@news-research/node'

import { Archiver } from './Archiver'
import { Fetcher } from './Fetcher'
import { SourceTarget } from './SourceTarget'
import { FetchAttempt } from './FetchAttempt'
import type { Response, NoResponse } from './FetchResult'

type CreateNoResponseInput = {
  runId: string
  fetchedAt: number
  result: NoResponse
  source: SourceTarget
}

function createNoResponseRecord(input: CreateNoResponseInput) {
  return NoResponseRecord({
    runId: input.runId,
    fetchedAt: input.fetchedAt,
    url: input.source.url,
    source: {
      name: input.source.name,
      collection: input.source.collection,
    },
    error: input.result.error,
  })
}

type CreateDataFetchedInput = {
  runId: string
  fetchedAt: number
  result: Response
  source: SourceTarget
  pointer: FilePointer
}

function createDataFetchedRecord(input: CreateDataFetchedInput) {
  return DataFetchedRecord({
    runId: input.runId,
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
    pointer: input.pointer,
  })
}

function createMetadata(
  id: string,
  attempt: FetchAttempt
): IngestionRecordMetadata {
  return {
    id,
    url: attempt.source.url,
    sourceName: attempt.source.name,
    sourceCollection: attempt.source.collection,
    runId: attempt.runId,
    fetchedAt: attempt.fetchedAt,
  }
}

function createIngestionAttempted(
  attempt: FetchAttempt,
  pointer: FilePointer // pointer to META json
): Effect.Effect<IngestionAttempted> {
  return Effect.gen(function* () {
    const components = Either.match(attempt.result, {
      onLeft: (result) => [
        `url=${attempt.source.url}`,
        `t=${attempt.fetchedAt}`,
        `error=${result.error}`,
      ],
      onRight: (result) => [
        `url=${attempt.source.url}`,
        `sha256=${result.sha256}`,
      ],
    })
    const base = [`v1`, ...components].join('|')
    const observationId = yield* Node.sha256Hex(base, 'utf8')

    return Either.match(attempt.result, {
      onLeft: (result) => ({
        observationId,
        runId: attempt.runId,
        fetchedAt: attempt.fetchedAt,
        url: attempt.source.url,
        source: {
          name: attempt.source.name,
          collection: attempt.source.collection,
        },
        http: {
          status: 0,
        },
        content: {
          sha256: undefined,
          bytes: undefined,
        },
        error: result.error,
        pointer,
      }),
      onRight: (result) => ({
        observationId,
        runId: attempt.runId,
        fetchedAt: attempt.fetchedAt,
        url: attempt.source.url,
        finalUrl: result.finalUrl,
        source: {
          name: attempt.source.name,
          collection: attempt.source.collection,
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
    const attempt: FetchAttempt = {
      runId,
      fetchedAt,
      source,
      result,
    }

    if (Either.isLeft(result)) {
      // In case of fetch failure, archive the attempt
      // record without archiving response body
      const record = createNoResponseRecord({
        runId,
        fetchedAt,
        source,
        result: result.left,
      })
      const meta = createMetadata(attempt.runId, attempt)
      const recordPointer = yield* archive.archiveRecord(
        path,
        attempt,
        record,
        meta
      )
      const event = yield* createIngestionAttempted(attempt, recordPointer)
      return event
    } else {
      // If fetch is successful, archive both the response
      // body and the attempt record
      const bodyPointer = yield* archive.archiveBody(
        path,
        attempt,
        result.right.body,
        result.right.contentType
      )
      const record = createDataFetchedRecord({
        runId,
        fetchedAt,
        source,
        result: result.right,
        pointer: bodyPointer,
      })
      const meta = createMetadata(attempt.runId, attempt)
      const recordPointer = yield* archive.archiveRecord(
        path,
        attempt,
        record,
        meta
      )
      const event = yield* createIngestionAttempted(attempt, recordPointer)
      return event
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
