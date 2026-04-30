import { Schema, ParseResult } from 'effect'
import { DeepMutable, Mutable } from 'effect/Types'

import * as v1 from '../../contracts/v1'
import { SourceSchema } from '../shared'
import { omitNullKeys } from '../../data'

import { PolicyDecisionSchema } from './PolicyDecision'

export class SanitizedObservation extends Schema.Class<SanitizedObservation>(
  'SanitizedObservation'
)({
  observationId: Schema.String,
  ingestionId: Schema.String,
  fetchedAt: Schema.Number,
  sanitizedAt: Schema.Number,
  outcome: Schema.Struct({
    decision: PolicyDecisionSchema,
    sanitized: Schema.NullOr(
      Schema.Struct({
        object: Schema.String,
        bucket: Schema.String,
      })
    ),
  }),
  source: SourceSchema,
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
  v1.SanitizerRecordSchema,
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
      const output: DeepMutable<v1.SanitizerRecord> = {
        version: 1 as const,
        kind: 'sanitized_record' as const,
        content_lineage_id: input.observationId,
        ingestion_batch_id: input.ingestionId,
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
          status: input.http.status,
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
  v1.SanitizerRecordMetadataSchema,
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
        observationId: input.observationId,
        ingestionId: input.ingestionId,
      }),
  }
)

export const SanitizedObservationPathSchema = Schema.transformOrFail(
  v1.ArchivePathSchema,
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
        collectionName: 'records',
        ext: `sanitize.yml`,
        sourceName: input.source.name,
        date: input.fetchedAt,
        ingestionId: input.ingestionId,
        observationId: input.observationId,
      }),
  }
)
