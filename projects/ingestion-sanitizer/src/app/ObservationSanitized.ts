import { Schema } from 'effect'

import { SourceConfigSchema } from '@fact-check-database/ingestion-contracts/config/v1'
import { FilePointerSchema } from '@fact-check-database/ingestion-contracts/archive/v1'

/**
 * Schema for the event published by the ingestor per fetch attempt.
 *
 * One event is emitted regardless of whether the fetch succeeded or failed.
 * The `observationId` is a deterministic hash of the fetch outcome, enabling
 * deduplication across runs. The `pointer` field references the archived
 * ingestor record in cloud storage.
 */
export class ObservationSanitized extends Schema.Class<ObservationSanitized>(
  'ObservationSanitized'
)({
  observationId: Schema.String, // deterministic: hash(url + fetchedAt + contentHash) or hash(url + contentHash)
  ingestionId: Schema.String,
  fetchedAt: Schema.Number,
  error: Schema.optional(Schema.String),
  source: SourceConfigSchema,
  http: Schema.optional(
    Schema.Struct({
      status: Schema.Number,
      finalUrl: Schema.optional(Schema.String),
      contentType: Schema.optional(Schema.String),
      etag: Schema.optional(Schema.String),
      lastModified: Schema.optional(Schema.String),
    })
  ),
  content: Schema.optional(
    Schema.Struct({
      sha256: Schema.optional(Schema.String),
      bytes: Schema.optional(Schema.Number),
    })
  ),
  pointer: FilePointerSchema,
}) {}
