import { Schema, ParseResult } from 'effect'

import * as v1 from '../../contracts/v1'

export class Observation extends Schema.Class<Observation>('Observation')({
  observationId: Schema.String,
  ingestionId: Schema.String,
  fetchedAt: Schema.Number,
  sanitizedAt: Schema.Number,
  url: Schema.String,
  shouldExtract: Schema.Boolean,
  sanitized: Schema.optional(
    Schema.Struct({
      object: Schema.String,
      bucket: Schema.String,
    })
  ),
  raw: Schema.optional(
    Schema.Struct({
      object: Schema.String,
      bucket: Schema.String,
    })
  ),
  finalUrl: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
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
}) {}

export const ObservationSchema = Schema.transformOrFail(
  v1.SanitizerRecordSchema,
  Observation,
  {
    strict: true,
    decode: (input) =>
      ParseResult.succeed({
        observationId: input.observation_id,
        ingestionId: input.ingestion_id,
        fetchedAt: input.fetched_at,
        sanitizedAt: input.sanitized_at,
        shouldExtract: input.outcome.label === 'SAFE_PUBLIC',
        error: input.error,
        url: input.url,
        finalUrl: input.final_url,
        sanitized: input.pointer,
        raw: input.input.raw,
        source: {
          name: input.source.name,
          collection: input.source.collection,
        },
        http:
          typeof input.http !== 'undefined'
            ? {
                status: input.http.status,
                contentType: input.http.content_type,
                etag: input.http.etag,
                lastModified: input.http.last_modified,
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
    encode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Encoding ExtractorInput not implemented'
        )
      ),
  }
)
