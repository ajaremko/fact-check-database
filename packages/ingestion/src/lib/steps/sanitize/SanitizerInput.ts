import { Schema, ParseResult } from 'effect'

import * as v1 from '../../contracts/v1'

export class SanitizerInput extends Schema.Class<SanitizerInput>(
  'SanitizerInput'
)({
  observationId: Schema.String,
  ingestionId: Schema.String,
  fetchedAt: Schema.Number,
  url: Schema.String,
  finalUrl: Schema.optional(Schema.String),
  error: Schema.optional(Schema.String),
  source: Schema.Struct({
    name: Schema.String,
    collection: Schema.String,
  }),
  dataFetched: Schema.Boolean,
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
  pointer: Schema.optional(
    Schema.Struct({
      bucket: Schema.String,
      object: Schema.String,
    })
  ),
}) {}

export const SanitizerInputSchema = Schema.transformOrFail(
  v1.IngestionRecordSchema,
  SanitizerInput,
  {
    strict: true,
    decode: (input) =>
      ParseResult.succeed({
        observationId: input.observation_id,
        ingestionId: input.ingestion_id,
        fetchedAt: input.fetched_at,
        dataFetched: input.outcome === 'data_fetched',
        error: input.error,
        url: input.url,
        finalUrl: input.final_url,
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
        pointer: input.pointer,
      }),
    encode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Encoding SanitizerInput not implemented'
        )
      ),
  }
)
