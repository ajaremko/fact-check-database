import { Schema, ParseResult } from 'effect'

import * as v1 from '../../contracts/v1'

import { PolicyDecisionSchema } from './PolicyDecision'

export class SanitizerOutcome extends Schema.Class<SanitizerOutcome>(
  'SanitizerOutcome'
)({
  observationId: Schema.String,
  ingestionId: Schema.String,
  fetchedAt: Schema.Number,
  sanitizedAt: Schema.Number,
  url: Schema.String,
  finalUrl: Schema.optional(Schema.String),
  outcome: Schema.Struct({
    decision: PolicyDecisionSchema,
    sanitized: Schema.optional(
      Schema.Struct({
        object: Schema.String,
        bucket: Schema.String,
      })
    ),
  }),
  source: Schema.Struct({
    name: Schema.String,
    collection: Schema.String,
  }),
  http: Schema.optional(
    Schema.Struct({
      status: Schema.Number,
      contentType: Schema.optional(Schema.String),
      etag: Schema.optional(Schema.String),
      lastModified: Schema.optional(Schema.String),
      headers: Schema.Record({ key: Schema.String, value: Schema.String }),
    })
  ),
  content: Schema.optional(
    Schema.Struct({
      sha256: Schema.String,
      bytes: Schema.Number,
    })
  ),
  error: Schema.optional(Schema.String),
  input: Schema.Struct({
    record: Schema.Struct({
      object: Schema.String,
      bucket: Schema.String,
    }),
    raw: Schema.optional(
      Schema.Struct({
        object: Schema.String,
        bucket: Schema.String,
      })
    ),
  }),
}) {}

export const SanitizerOutcomeSchema = Schema.transformOrFail(
  v1.SanitizerRecordSchema,
  SanitizerOutcome,
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding SanitizerOutcome not implemented'
        )
      ),
    encode: (input) =>
      ParseResult.succeed({
        version: 1 as const,
        kind: 'sanitized_record' as const,
        observation_id: input.observationId,
        ingestion_id: input.ingestionId,
        sanitized_at: input.sanitizedAt,
        fetched_at: input.fetchedAt,
        outcome: input.outcome.decision,
        input: {
          record: input.input.record,
          raw: input.input.raw,
        },
        sanitized: input.outcome.sanitized,
        error: input.error,
        url: input.url,
        final_url: input.finalUrl ?? input.url,
        source: {
          name: input.source.name,
          collection: input.source.collection,
        },
        http:
          typeof input.http !== 'undefined'
            ? {
                status: input.http.status,
                content_type: input.http.contentType,
                etag: input.http.etag,
                last_modified: input.http.lastModified,
                headers: input.http.headers ?? {},
              }
            : undefined,
        content:
          typeof input.content !== 'undefined'
            ? {
                sha256: input.content.sha256,
                bytes: input.content.bytes,
              }
            : undefined,
      }),
  }
)

export const SanitizerOutcomeMetaSchema = Schema.transformOrFail(
  v1.SanitizerRecordMetadataSchema,
  SanitizerOutcome,
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding SanitizerOutcomeMeta not implemented'
        )
      ),
    encode: (input) =>
      ParseResult.succeed({
        url: input.url,
        sourceName: input.source.name,
        sourceCollection: input.source.collection,
        fetchedAt: input.fetchedAt,
        sanitizedAt: input.sanitizedAt,
        observationId: input.observationId,
        ingestionId: input.ingestionId,
      }),
  }
)
