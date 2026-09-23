import { Schema, ParseResult } from 'effect'
import { DeepMutable, Mutable } from 'effect/Types'

import { omitNullKeys } from '@fact-check-database/core-data'

import {
  SanitizerRecordSchema,
  SanitizerRecord,
  SanitizerRecordMetadataSchema,
  ArchivePathSchema,
} from '@fact-check-database/ingestion-contracts/archive/v1'
import { SourceConfigSchema } from '@fact-check-database/ingestion-contracts/config/v1'
import { TimestampSchema } from '@fact-check-database/ingestion-contracts/shared/v1'

import { PolicyDecisionSchema } from './PolicyDecision'

export class SanitizedObservation extends Schema.Class<SanitizedObservation>(
  'SanitizedObservation'
)({
  ingestorRunId: Schema.String,
  fetchedAt: TimestampSchema,
  sanitizedAt: TimestampSchema,
  outcome: Schema.Struct({
    decision: PolicyDecisionSchema,
    sanitized: Schema.NullOr(
      Schema.Struct({
        object: Schema.String,
        bucket: Schema.String,
      })
    ),
  }),
  source: SourceConfigSchema,
  http: Schema.NullOr(
    Schema.Struct({
      finalUrl: Schema.NullOr(Schema.String),
      status: Schema.Number,
      contentType: Schema.NullOr(Schema.String),
      etag: Schema.NullOr(Schema.String),
      lastModified: Schema.NullOr(Schema.String),
      headers: Schema.Record({ key: Schema.String, value: Schema.String }),
    })
  ),
  content: Schema.NullOr(
    Schema.Struct({
      sha256: Schema.String,
      bytes: Schema.Number,
    })
  ),
  error: Schema.NullOr(Schema.String),
  input: Schema.Struct({
    record: Schema.Struct({
      object: Schema.String,
      bucket: Schema.String,
    }),
    raw: Schema.NullOr(
      Schema.Struct({
        object: Schema.String,
        bucket: Schema.String,
      })
    ),
  }),
}) {}

export const SanitizedObservationSchema = Schema.transformOrFail(
  SanitizerRecordSchema,
  SanitizedObservation,
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding SanitizedObservation not implemented'
        )
      ),
    encode: (input) => {
      const output: DeepMutable<SanitizerRecord> = {
        version: 1 as const,
        kind: 'sanitized_record' as const,
        ingestor_run_id: input.ingestorRunId,
        fetched_at: input.fetchedAt,
        sanitized_at: input.sanitizedAt,
        source: {
          id: input.source.id,
          name: input.source.name,
          url: input.source.url,
          collection: input.source.collection,
        },
        input: {
          record: input.input.record,
        },
        label: input.outcome.decision.label,
        actions: input.outcome.decision.actions as Mutable<
          typeof input.outcome.decision.actions
        >,
        bytes_rewritten: input.outcome.decision.rewriteBody,
      }
      if (input.outcome.decision.error) {
        output.error = input.outcome.decision.error
      }
      if (input.http) {
        output.http = omitNullKeys({
          status_code: input.http.status,
          final_url: input.http.finalUrl,
          content_type: input.http.contentType,
          etag: input.http.etag,
          last_modified: input.http.lastModified,
          headers: input.http.headers,
        })
      }
      if (input.input.raw) {
        output.input.raw = input.input.raw
      }
      if (input.content) {
        if (input.outcome.sanitized) {
          output.content = {
            sha256: input.content.sha256,
            bytes: input.content.bytes,
            sanitized: input.outcome.sanitized,
          }
        } else if (input.input.raw) {
          output.content = {
            sha256: input.content.sha256,
            bytes: input.content.bytes,
            sanitized: input.input.raw,
          }
        }
      }
      return ParseResult.succeed(output)
    },
  }
)

export const SanitizedObservationMetaSchema = Schema.transformOrFail(
  SanitizerRecordMetadataSchema,
  SanitizedObservation,
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding SanitizedObservationMeta not implemented'
        )
      ),
    encode: (input) =>
      ParseResult.succeed({
        url: input.source.url,
        sourceName: input.source.name,
        sourceCollection: input.source.collection,
        fetchedAt: input.fetchedAt,
        sanitizedAt: input.sanitizedAt,
        ingestorRunId: input.ingestorRunId,
      }),
  }
)

export const SanitizedObservationPathSchema = Schema.transformOrFail(
  ArchivePathSchema,
  SanitizedObservation,
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding SanitizedObservationPath not implemented'
        )
      ),
    encode: (input) =>
      ParseResult.succeed({
        version: 1 as const,
        collectionName: 'records/sanitizer',
        ext: `yml`,
        sourceId: input.source.id,
        date: input.fetchedAt,
        ingestorRunId: input.ingestorRunId,
        fileName: 'fetch_attempt',
      }),
  }
)
