import { Schema } from 'effect'
import { FilePointerSchema } from './FilePointer.js'

/**
 * High-level outcomes. Label is about who can access downstream.
 */
export const PolicyLabelSchema = Schema.Literal(
  'SAFE_PUBLIC',
  'RESTRICTED',
  'QUARANTINED'
)

export type PolicyLabel = Schema.Schema.Type<typeof PolicyLabelSchema>

/**
 * Traceable actions taken by the sanitizer.
 */
export const SanitizationActionSchema = Schema.Literal(
  'NONE',
  'URL_NORMALIZED',
  'QUERY_STRIPPED',
  'FRAGMENT_STRIPPED',
  'DROPPED_HEADERS',
  'BODY_STRIPPED',
  'BODY_REWRITTEN',
  'QUARANTINED_TOO_LARGE',
  'QUARANTINED_UNEXPECTED_CONTENT_TYPE',
  'QUARANTINED_FETCH_FAILED'
)

export type SanitizationAction = Schema.Schema.Type<
  typeof SanitizationActionSchema
>

export const SourceSchema = Schema.Struct({
  name: Schema.String,
  collection: Schema.String, // "rss" | "api" | "html" | ...
})

export const HttpSummarySchema = Schema.Struct({
  status: Schema.Number,
  contentType: Schema.optional(Schema.String),
  etag: Schema.optional(Schema.String),
  lastModified: Schema.optional(Schema.String),

  // Keep optional: many pipelines omit headers entirely in sanitized outputs.
  headers: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.String })
  ),
})

export const ContentSummarySchema = Schema.Struct({
  sha256: Schema.optional(Schema.String),
  bytes: Schema.optional(Schema.Number),
})

// Reference the *input ingest record* (and optionally its raw bytes pointer)
export const InputRecordRefSchema = Schema.Struct({
  record: FilePointerSchema,
  raw: Schema.optional(FilePointerSchema),
})

export const SanitizerRecordSchema = Schema.Struct({
  kind: Schema.Literal('sanitized_record'),
  version: Schema.Literal(1),

  // Identity
  sanitizationId: Schema.String, // uuid or deterministic hash
  runId: Schema.String,
  sanitizedAt: Schema.Number,

  // Provenance
  input: InputRecordRefSchema,

  // Normalized fields
  url: Schema.String,
  finalUrl: Schema.optional(Schema.String),
  source: SourceSchema,

  http: HttpSummarySchema,
  content: ContentSummarySchema,

  policy: Schema.Struct({
    label: PolicyLabelSchema,
    actions: Schema.Array(SanitizationActionSchema),
    notes: Schema.optional(Schema.String),
  }),

  // If you rewrite bytes, point to sanitized raw here.
  // If you do not rewrite, you can omit or point to original raw depending on your policy stance.
  sanitizedRaw: Schema.optional(FilePointerSchema),

  // For quarantined items (or other failures)
  error: Schema.optional(Schema.String),
})

export type SanitizerRecord = Schema.Schema.Type<typeof SanitizerRecordSchema>

export const SantizerRecordMetadataSchema = Schema.Struct({
  url: Schema.String,
  sourceName: Schema.String,
  sourceCollection: Schema.String,
  sanitizedAt: Schema.NumberFromString,
  id: Schema.String,
})

export type SantizerRecordMetadata = Schema.Schema.Type<
  typeof SantizerRecordMetadataSchema
>
