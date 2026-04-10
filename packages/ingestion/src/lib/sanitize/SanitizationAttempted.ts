import { Schema } from 'effect'

import { FilePointerSchema } from '../data/FilePointer.js'

/**
 * Schema for the event published by the ingestor per fetch attempt.
 *
 * One event is emitted regardless of whether the fetch succeeded or failed.
 * The `observationId` is a deterministic hash of the fetch outcome, enabling
 * deduplication across runs. The `pointer` field references the archived
 * ingestor record in cloud storage.
 */
export class SanitizationAttempted extends Schema.Class<SanitizationAttempted>(
  'SanitizationAttempted'
)({
  observationId: Schema.String, // deterministic: hash(url + fetchedAt + contentHash) or hash(url + contentHash)
  runId: Schema.String,
  fetchedAt: Schema.Number,
  url: Schema.String,
  finalUrl: Schema.optional(Schema.String),
  source: Schema.Struct({
    name: Schema.String,
    collection: Schema.String, // "csv" | "rss" | "gdelt" later
  }),
  http: Schema.Struct({
    status: Schema.Number,
    contentType: Schema.optional(Schema.String),
    etag: Schema.optional(Schema.String),
    lastModified: Schema.optional(Schema.String),
  }),
  content: Schema.Struct({
    sha256: Schema.optional(Schema.String),
    bytes: Schema.optional(Schema.Number),
  }),
  error: Schema.optional(Schema.String),
  pointer: FilePointerSchema,
}) {}
