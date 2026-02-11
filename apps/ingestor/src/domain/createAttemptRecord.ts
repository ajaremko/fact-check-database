import {
  DataFetched,
  NoResponse,
  FilePointer,
  Metadata,
} from '@news-research/contracts'

import type { FetchAttempt, FetchFailure, FetchSuccess } from './FetchAttempt'

export function createDataFetched(
  attempt: FetchSuccess,
  pointer: FilePointer
): DataFetched {
  return {
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
  }
}

export function createNoResponse(attempt: FetchFailure): NoResponse {
  return {
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
  }
}

export function createMetadata(id: string, attempt: FetchAttempt): Metadata {
  return {
    id,
    url: attempt.url,
    sourceName: attempt.sourceName,
    sourceCollection: attempt.sourceCollection,
    runId: attempt.runId,
    fetchedAt: attempt.fetchedAt,
  }
}
