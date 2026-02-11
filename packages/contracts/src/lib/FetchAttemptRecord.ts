import { Schema } from 'effect'

import { FilePointerSchema } from './FilePointer.js'

export const DataFetchedRecordSchema = Schema.Struct({
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

export type DataFetchedRecord = Schema.Schema.Type<
  typeof DataFetchedRecordSchema
>

export function DataFetchedRecord(
  input: Omit<DataFetchedRecord, 'version' | 'kind' | 'outcome'>
): DataFetchedRecord {
  return {
    version: 1,
    kind: 'fetch_attempt',
    outcome: 'data_fetched',
    ...input,
  }
}

export const NoResponseRecordSchema = Schema.Struct({
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

export type NoResponseRecord = Schema.Schema.Type<typeof NoResponseRecordSchema>

export function NoResponseRecord(
  input: Omit<NoResponseRecord, 'version' | 'kind' | 'outcome'>
): NoResponseRecord {
  return {
    version: 1,
    kind: 'fetch_attempt',
    outcome: 'no_response',
    ...input,
  }
}

export const FetchAttemptRecordSchema = Schema.Union(
  DataFetchedRecordSchema,
  NoResponseRecordSchema
)

export type FetchAttemptRecord = Schema.Schema.Type<
  typeof FetchAttemptRecordSchema
>

export const MetadataSchema = Schema.Struct({
  url: Schema.String,
  sourceName: Schema.String,
  sourceCollection: Schema.String,
  runId: Schema.String,
  fetchedAt: Schema.NumberFromString,
  id: Schema.String,
})

export type Metadata = Schema.Schema.Type<typeof MetadataSchema>
