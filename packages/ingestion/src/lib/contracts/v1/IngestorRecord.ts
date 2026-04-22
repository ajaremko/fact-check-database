import { Schema } from 'effect'

import { ContentSummarySchema } from './ContentSummary'
import { FilePointerSchema } from './FilePointer'
import { HttpSummarySchema } from './HttpSummary'
import { SourceSummarySchema } from './SourceSummary'

/**
 * Schema for a record produced when an HTTP fetch returns a response body, or
 * entirely (network error, timeout, DNS failure, etc.)..
 *
 * Discriminators: `version: 1`, `kind: 'fetch_attempt'`, `outcome: 'data_fetched'`.
 *
 * Includes full response headers in `http.headers` alongside the archived body pointer.
 * No `pointer` or content fields are present — there is no body to archive.
 */
export const IngestionRecordSchema = Schema.Struct({
  version: Schema.Literal(1),
  kind: Schema.Literal('fetch_attempt'),
  outcome: Schema.Literal('no_response', 'data_fetched'),
  observation_id: Schema.String,
  ingestion_id: Schema.String,
  fetched_at: Schema.Number,
  url: Schema.String,
  final_url: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
  source: SourceSummarySchema,
  http: Schema.optional(HttpSummarySchema),
  content: Schema.optional(ContentSummarySchema),
  pointer: Schema.optional(FilePointerSchema),
}).annotations({
  identifier: 'v1IngestionRecord',
  title: 'IngestionRecord',
  description: `
    Schema for a record produced when an HTTP fetch returns 
    a response body or encounters an error.`,
})

export type IngestionRecord = Schema.Schema.Type<typeof IngestionRecordSchema>

export const IngestionRecordMetadataSchema = Schema.Struct({
  observationId: Schema.String,
  ingestionId: Schema.String,
  sourceName: Schema.String,
  sourceCollection: Schema.String,
  fetchedAt: Schema.NumberFromString,
  url: Schema.String,
})

export type IngestionRecordMetadata = Schema.Schema.Type<
  typeof IngestionRecordMetadataSchema
>
