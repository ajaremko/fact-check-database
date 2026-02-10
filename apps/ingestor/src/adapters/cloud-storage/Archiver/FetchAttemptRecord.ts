import { pipe, Schema } from 'effect'

import {
  DataFetchedSchema,
  NoResponseSchema,
  FilePointer,
} from '@news-research/contracts'

import { FetchFailure, FetchSuccess } from '../../../domain/FetchAttempt'
import { parseBuffer, parseJson } from '../../../utils/schema'

const encodeDataFetched = pipe(
  DataFetchedSchema,
  parseJson(),
  parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeSync
)

export function createDataFetched(attempt: FetchSuccess, pointer: FilePointer) {
  return encodeDataFetched({
    version: 1,
    kind: 'fetch_attempt',
    outcome: 'data_fetched',
    runId: attempt.runId,
    fetchedAt: attempt.fetchedAt,
    url: attempt.url,
    source: {
      name: attempt.sourceName,
      collection: attempt.sourceCollection,
    },
    http: {
      status: attempt.http.status,
      contentType: attempt.http.contentType,
      etag: attempt.http.etag,
      lastModified: attempt.http.lastModified,
      headers: attempt.http.headers,
    },
    content: {
      sha256: attempt.content.sha256,
      bytes: attempt.content.bytes,
    },
    pointer,
  })
}

const encodeNoResponse = pipe(
  NoResponseSchema,
  parseJson(),
  parseBuffer({ encoding: 'utf-8' }),
  Schema.encodeSync
)

export function createNoResponse(attempt: FetchFailure) {
  return encodeNoResponse({
    version: 1,
    kind: 'fetch_attempt',
    outcome: 'no_response',
    runId: attempt.runId,
    fetchedAt: attempt.fetchedAt,
    url: attempt.url,
    finalUrl: attempt.finalUrl,
    source: {
      name: attempt.sourceName,
      collection: attempt.sourceCollection,
    },
    error: attempt.error,
  })
}

export const encodeMetadata = Schema.encodeSync(
  Schema.Struct({
    url: Schema.String,
    sourceName: Schema.String,
    sourceCollection: Schema.String,
    runId: Schema.String,
    fetchedAt: Schema.NumberFromString,
    id: Schema.String,
  })
)
