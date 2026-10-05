import { Schema } from 'effect'

import { FilePointerSchema } from './FilePointer'
import { SourceSchema } from './Source'

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
  'QUARANTINED_EMPTY_BODY',
  'QUARANTINED_UNEXPECTED_CONTENT_TYPE',
  'QUARANTINED_FETCH_FAILED'
)

/** Actions applied by the sanitizer to a record. */
export type SanitizationAction = Schema.Schema.Type<
  typeof SanitizationActionSchema
>

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
 * `label` is the access classification and `actions` the full ordered list
 * of actions applied; for quarantined records, `error` describes the reason.
 *
 * `content` describes the body downstream stages read. `content.sanitized`
 * points at it, and `content.sha256` and `content.bytes` are its hash and
 * size. When the sanitizer rewrote the body, that is the sanitized copy and
 * `bytes_rewritten` is true. Otherwise it is the raw body, unchanged. In both
 * cases `input.raw` points at the raw body as it was fetched.
 */
export const SanitizerRecordSchema = Schema.Struct({
  version: Schema.Literal(1),
  kind: Schema.Literal('sanitized_record'),
  ingestor_run_id: Schema.String,
  fetched_at: Schema.Number,
  sanitized_at: Schema.Number,
  source: SourceSchema,
  input: Schema.Struct({
    record: FilePointerSchema,
    raw: Schema.optional(FilePointerSchema),
  }),
  error: Schema.optional(Schema.String),
  label: PolicyLabelSchema,
  actions: Schema.Array(SanitizationActionSchema),
  notes: Schema.optional(Schema.String),
  // True when the sanitizer wrote a sanitized copy of the body, which
  // `content.sanitized` then points at
  bytes_rewritten: Schema.optional(Schema.Boolean),
  http: Schema.optional(
    Schema.Struct({
      error: Schema.optional(Schema.String),
      final_url: Schema.optional(Schema.String),
      status_code: Schema.Number,
      content_type: Schema.optional(Schema.String),
      etag: Schema.optional(Schema.String),
      last_modified: Schema.optional(Schema.String),
      headers: Schema.optional(
        Schema.Record({ key: Schema.String, value: Schema.String })
      ),
    })
  ),
  content: Schema.optional(
    Schema.Struct({
      sha256: Schema.String,
      bytes: Schema.Number,
      sanitized: FilePointerSchema,
    })
  ),
}).annotations({
  identifier: 'v1SanitizerRecord',
  title: 'SanitizerRecord',
  description: `
    Produced when a sanitization policy is applied to an ingested 
    observation. Documents the policy outcome and traceable actions 
    taken, with pointers to the original ingestor record and sanitized 
    bytes if applicable.`,
})

export type SanitizerRecord = Schema.Schema.Type<typeof SanitizerRecordSchema>

/**
 * Schema for the flat metadata stored as GCS object metadata fields alongside
 * each archived sanitizer record. `sanitizedAt` is stored as a string in GCS
 * and decoded to a number on read.
 */
export const SanitizerRecordMetadataSchema = Schema.Struct({
  url: Schema.String,
  sourceName: Schema.String,
  sourceCollection: Schema.String,
  fetchedAt: Schema.NumberFromString,
  sanitizedAt: Schema.NumberFromString,
  ingestorRunId: Schema.String,
}).annotations({
  identifier: 'v1SanitizerRecordMetadata',
  title: 'SanitizerRecordMetadata',
  description: `
    Flat metadata stored as GCS object metadata fields alongside 
    each archived sanitizer record. Provides key provenance and 
    traceability details for quick reference without accessing the 
    full record content.`,
})

/** Metadata for a sanitized record. */
export type SanitizerRecordMetadata = Schema.Schema.Type<
  typeof SanitizerRecordMetadataSchema
>
