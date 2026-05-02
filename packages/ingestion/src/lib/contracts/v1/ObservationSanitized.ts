import { Schema } from 'effect'

import { FilePointerSchema } from './FilePointer'
import { SourceSchema } from './Source'

/**
 * Schema for the event published by the ingestor per fetch attempt.
 *
 * One event is emitted regardless of whether the fetch succeeded or failed.
 * The `observationId` is a deterministic hash of the fetch outcome, enabling
 * deduplication across runs. The `pointer` field references the archived
 * ingestor record in cloud storage.
 */
export const ObservationSanitizedSchema = Schema.Struct({
  version: Schema.Literal(1),
  content_lineage_id: Schema.String,
  ingestion_batch_id: Schema.String,
  sanitizer_batch_id: Schema.optional(Schema.String),
  fetched_at: Schema.Number,
  sanitized_at: Schema.Number,
  source: SourceSchema,
  error: Schema.optional(Schema.String),
  label: Schema.String,
  actions: Schema.Array(Schema.String),
  bytes_rewritten: Schema.optional(Schema.Boolean),
  content_sha256: Schema.optional(Schema.String),
  content_bytes: Schema.optional(Schema.Number),
  rewritten_sha256: Schema.optional(Schema.String),
  rewritten_bytes: Schema.optional(Schema.Number),
  pointer: FilePointerSchema,
})
