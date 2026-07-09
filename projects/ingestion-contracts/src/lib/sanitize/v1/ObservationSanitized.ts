import { Schema } from 'effect'

import {
  FilePointerSchema,
  SourceSchema,
  PolicyLabelSchema,
  SanitizationActionSchema,
} from '../../shared/v1'

/**
 * Schema for the event published by the sanitizer after processing an
 * ingested observation.
 *
 * Carries the policy classification (`label`) assigned to the observation's
 * content and the remediation `actions` applied while sanitizing it. The
 * `content_lineage_id` correlates the event back to the originating
 * ingestion event, and `pointer` references the archived sanitizer record
 * in cloud storage.
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
  label: PolicyLabelSchema,
  actions: Schema.Array(SanitizationActionSchema),
  bytes_rewritten: Schema.optional(Schema.Boolean),
  content_sha256: Schema.optional(Schema.String),
  content_bytes: Schema.optional(Schema.Number),
  rewritten_sha256: Schema.optional(Schema.String),
  rewritten_bytes: Schema.optional(Schema.Number),
  pointer: FilePointerSchema,
})
