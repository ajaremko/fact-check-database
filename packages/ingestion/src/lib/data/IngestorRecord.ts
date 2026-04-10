import { Schema } from 'effect'

import { FilePointerSchema } from './FilePointer.js'

/**
 * Schema for a record produced when an HTTP fetch returns a response body.
 *
 * Discriminators: `version: 1`, `kind: 'fetch_attempt'`, `outcome: 'data_fetched'`.
 * Includes full response headers in `http.headers` alongside the archived body pointer.
 */
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

/**
 * Schema for a record produced when an HTTP fetch fails entirely (network
 * error, timeout, DNS failure, etc.).
 *
 * Discriminators: `version: 1`, `kind: 'fetch_attempt'`, `outcome: 'no_response'`.
 * No `pointer` or content fields are present — there is no body to archive.
 */
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

/**
 * Union schema accepting either a `DataFetchedRecord` or a `NoResponseRecord`.
 * Discriminates on the `outcome` field.
 */
export const IngestionRecordSchema = Schema.Union(
  DataFetchedRecordSchema,
  NoResponseRecordSchema
)

/** Union type representing either a `DataFetchedRecord` or a `NoResponseRecord`. */
export type IngestionRecord = Schema.Schema.Type<typeof IngestionRecordSchema>

/**
 * Schema for the flat metadata stored as GCS object metadata fields alongside
 * each archived ingestor record. `fetchedAt` is stored as a string in GCS and
 * decoded to a number on read.
 */
export const IngestionRecordMetadataSchema = Schema.Struct({
  url: Schema.String,
  sourceName: Schema.String,
  sourceCollection: Schema.String,
  runId: Schema.String,
  fetchedAt: Schema.NumberFromString,
  id: Schema.String,
})

/** Metadata for an ingestor record. */
export type IngestionRecordMetadata = Schema.Schema.Type<
  typeof IngestionRecordMetadataSchema
>
