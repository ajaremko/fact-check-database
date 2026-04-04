import { Schema } from 'effect'
import { FilePointerSchema } from './FilePointer.js'

/**
 * High-level access classification assigned to each sanitized record.
 * Determines who may access the record downstream:
 * - `SAFE_PUBLIC` — suitable for unrestricted downstream access
 * - `RESTRICTED` — requires access controls before use
 * - `QUARANTINED` — withheld from downstream use pending review
 */
export const PolicyLabelSchema = Schema.Literal(
  'SAFE_PUBLIC',
  'RESTRICTED',
  'QUARANTINED'
)

/** High-level access classification assigned to each sanitized record. */
export type PolicyLabel = Schema.Schema.Type<typeof PolicyLabelSchema>

/**
 * Traceable actions applied by the sanitizer. Multiple actions may be recorded
 * per record; the full list forms an append-only audit trail of modifications.
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

/** Actions applied by the sanitizer to a record. */
export type SanitizationAction = Schema.Schema.Type<
  typeof SanitizationActionSchema
>

/** Source name and collection label shared across record types. */
export const SourceSchema = Schema.Struct({
  name: Schema.String,
  collection: Schema.String, // "rss" | "api" | "html" | ...
})

/**
 * HTTP response metadata included in sanitized records.
 * `headers` is optional — many pipelines omit it entirely in sanitized outputs.
 */
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

/** Content metrics included in sanitized records. */
export const ContentSummarySchema = Schema.Struct({
  sha256: Schema.optional(Schema.String),
  bytes: Schema.optional(Schema.Number),
})

/**
 * Reference to the input ingestor record that was sanitized.
 * `raw` optionally points to the original raw bytes if they were retained.
 */
export const InputRecordRefSchema = Schema.Struct({
  record: FilePointerSchema,
  raw: Schema.optional(FilePointerSchema),
})

/**
 * Schema for a record produced by the sanitizer after processing an ingestor record.
 *
 * Discriminators: `kind: 'sanitized_record'`, `version: 1`.
 * The `policy` field documents the access classification and the full ordered
 * list of actions applied. If the body was rewritten, `sanitizedRaw` points to
 * the modified bytes; for quarantined records, `error` describes the reason.
 */
export const SanitizerRecordSchema = Schema.Struct({
  kind: Schema.Literal('sanitized_record'),
  version: Schema.Literal(1),

  // Identity
  sanitizationId: Schema.String, // uuid or deterministic hash
  runId: Schema.String,
  fetchedAt: Schema.Number,
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

/**
 * Schema for the flat metadata stored as GCS object metadata fields alongside
 * each archived sanitizer record. `sanitizedAt` is stored as a string in GCS
 * and decoded to a number on read.
 */
export const SantizerRecordMetadataSchema = Schema.Struct({
  url: Schema.String,
  sourceName: Schema.String,
  sourceCollection: Schema.String,
  fetchedAt: Schema.NumberFromString,
  sanitizedAt: Schema.NumberFromString,
  id: Schema.String,
})

/** Metadata for a sanitized record. */
export type SantizerRecordMetadata = Schema.Schema.Type<
  typeof SantizerRecordMetadataSchema
>
