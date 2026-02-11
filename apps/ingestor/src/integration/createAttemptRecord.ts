import {
  NoResponseRecord,
  DataFetchedRecord,
  FilePointer,
  Metadata,
} from '@news-research/contracts'

import type { FetchAttempt } from '../data/FetchAttempt'
import type { Response, NoResponse } from '../data/FetchResult'
import { SourceTarget } from '../data/SourceTarget'

export type CreateNoResponseInput = {
  runId: string
  fetchedAt: number
  result: NoResponse
  source: SourceTarget
}

export function createNoResponseRecord(input: CreateNoResponseInput) {
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

export type CreateDataFetchedInput = {
  runId: string
  fetchedAt: number
  result: Response
  source: SourceTarget
  pointer: FilePointer
}

export function createDataFetchedRecord(input: CreateDataFetchedInput) {
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

export function createMetadata(id: string, attempt: FetchAttempt): Metadata {
  return {
    id,
    url: attempt.source.url,
    sourceName: attempt.source.name,
    sourceCollection: attempt.source.collection,
    runId: attempt.runId,
    fetchedAt: attempt.fetchedAt,
  }
}
