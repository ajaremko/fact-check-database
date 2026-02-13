import { Schema } from 'effect'

import { FilePointerSchema } from './FilePointer.js'

export const IngestionAttemptedSchema = Schema.Struct({
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
})

export type IngestionAttempted = Schema.Schema.Type<
  typeof IngestionAttemptedSchema
>
