import { Schema } from 'effect'

import { SourceSchema, FilePointerSchema } from '../../shared/v1'

/**
 * Schema for the event published by the ingestor per fetch attempt.
 *
 * One event is emitted regardless of whether the fetch succeeded or failed.
 * The `content_lineage_id` is a deterministic hash of the fetch outcome, enabling
 * deduplication across runs. The `pointer` field references the archived
 * ingestor record in cloud storage.
 */
export const ObservationIngestedSchema = Schema.Struct({
  version: Schema.Literal(1),
  content_lineage_id: Schema.String,
  ingestion_batch_id: Schema.String,
  fetched_at: Schema.Number,
  source: SourceSchema,
  error: Schema.optional(Schema.String),
  final_url: Schema.optional(Schema.String),
  status: Schema.optional(Schema.Number),
  content_type: Schema.optional(Schema.String),
  etag: Schema.optional(Schema.String),
  last_modified: Schema.optional(Schema.String),
  content_sha256: Schema.optional(Schema.String),
  content_bytes: Schema.optional(Schema.Number),
  pointer: FilePointerSchema,
}).annotations({
  identifier: 'v1ObservationIngested',
  title: 'ObservationIngested',
  description: `
    An event emitted by the ingestor for each fetch attempt, successful or not. 
    It captures the outcome of the fetch, including metadata about the source, 
    HTTP response details, and a pointer to the archived record in cloud storage.`,
})
