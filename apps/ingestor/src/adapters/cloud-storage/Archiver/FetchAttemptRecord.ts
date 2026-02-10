import { pipe, Schema } from 'effect'

import { FetchFailure, FetchSuccess } from '../../../domain/FetchAttempt'
import { parseBuffer, parseJson } from '../../../utils/schema'

const FilePointerSchema = Schema.Struct({
  bucket: Schema.String,
  object: Schema.String,
  generation: Schema.optional(Schema.Number),
})

type FilePointer = Schema.Schema.Type<typeof FilePointerSchema>

const DataFetchedSchema = Schema.Struct({
  version: Schema.Literal(1),
  kind: Schema.Literal('fetch_attempt'),
  outcome: Schema.Literal('data_fetched'),
  runId: Schema.String,
  fetchedAt: Schema.Number,
  url: Schema.String,
  source: Schema.Struct({ name: Schema.String, collection: Schema.String }),
  http: Schema.Struct({
    status: Schema.Number,
    contentType: Schema.optional(Schema.String),
    etag: Schema.optional(Schema.String),
    lastModified: Schema.optional(Schema.String),
    headers: Schema.Record({ key: Schema.String, value: Schema.String }),
  }),
  content: Schema.Struct({
    sha256: Schema.optional(Schema.String),
    bytes: Schema.optional(Schema.Number),
  }),
  pointer: FilePointerSchema,
})

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

const NoResponseSchema = Schema.Struct({
  version: Schema.Literal(1),
  kind: Schema.Literal('fetch_attempt'),
  outcome: Schema.Literal('no_response'),
  runId: Schema.String,
  fetchedAt: Schema.Number,
  url: Schema.String,
  finalUrl: Schema.optional(Schema.String),
  source: Schema.Struct({ name: Schema.String, collection: Schema.String }),
  error: Schema.String,
})

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
