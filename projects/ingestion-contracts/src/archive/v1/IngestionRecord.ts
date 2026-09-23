import { Schema } from 'effect'

import { FilePointerSchema } from './FilePointer'
import { SourceSchema } from './Source'

/**
 * Schema for a record produced when an HTTP fetch returns a response body, or
 * entirely (network error, timeout, DNS failure, etc.)..
 *
 * Discriminators: `version: 1`, `kind: 'fetch_attempt'`, `outcome: 'data_fetched'`.
 *
 * Includes full response headers in `http.headers` alongside the archived body pointer.
 * If no `pointer` or content fields are present — there is no body to archive.
 */
export const IngestionRecordSchema = Schema.Struct({
  version: Schema.Literal(1),
  kind: Schema.Literal('fetch_attempt'),
  outcome: Schema.Literal('no_response', 'data_fetched'),
  ingestor_run_id: Schema.String,
  fetched_at: Schema.Number,
  source: SourceSchema,
  error: Schema.optional(Schema.String),
  final_url: Schema.optional(Schema.String),
  status: Schema.optional(Schema.Number),
  content_type: Schema.optional(Schema.String),
  etag: Schema.optional(Schema.String),
  last_modified: Schema.optional(Schema.String),
  headers: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.String })
  ),
  content: Schema.optional(
    Schema.Struct({
      sha256: Schema.String,
      bytes: Schema.Number,
      raw: FilePointerSchema,
    })
  ),
}).annotations({
  identifier: 'v1IngestionRecord',
  title: 'IngestionRecord',
  description: `
    A record produced when data is ingested via http. 
    It captures both successful http GET requests with data 
    and failed attempts with error details as well as 
    metadata about the source and HTTP response.`,
})

export type IngestionRecord = Schema.Schema.Type<typeof IngestionRecordSchema>

export const IngestionRecordMetadataSchema = Schema.Struct({
  ingestorRunId: Schema.String,
  sourceName: Schema.String,
  sourceCollection: Schema.String,
  fetchedAt: Schema.NumberFromString,
  url: Schema.String,
}).annotations({
  identifier: 'v1IngestionRecordMetadata',
  title: 'IngestionRecordMetadata',
  description: `
    Flat metadata stored as GCS object metadata fields alongside 
    each archived ingestion record. Provides key provenance and 
    traceability details for quick reference without accessing the 
    full record content.`,
})

export type IngestionRecordMetadata = Schema.Schema.Type<
  typeof IngestionRecordMetadataSchema
>
