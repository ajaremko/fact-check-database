import { Schema, ParseResult } from 'effect'

import * as v1 from '../../contracts/v1'

import { SourceCollectionSchema, SourceSchema } from '../shared'

export class Observation extends Schema.Class<Observation>('Observation')({
  observationId: Schema.String,
  ingestionId: Schema.String,
  fetchedAt: Schema.Number,
  sanitizedAt: Schema.Number,
  shouldExtract: Schema.Boolean,
  sanitized: Schema.NullOr(
    Schema.Struct({
      object: Schema.String,
      bucket: Schema.String,
    })
  ),
  raw: Schema.NullOr(
    Schema.Struct({
      object: Schema.String,
      bucket: Schema.String,
    })
  ),
  error: Schema.NullOr(Schema.String),
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
}) {}

const isSourceCollection = Schema.is(SourceCollectionSchema)

export const ObservationSchema = Schema.transformOrFail(
  v1.SanitizerRecordSchema,
  Observation,
  {
    strict: true,
    decode: (input, _, ast) => {
      if (!isSourceCollection(input.source.collection)) {
        return ParseResult.fail(
          new ParseResult.Type(
            ast,
            input,
            'source.collection must be "rss" or "atom"'
          )
        )
      }
      return ParseResult.succeed({
        observationId: input.content_lineage_id,
        ingestionId: input.ingestion_batch_id,
        fetchedAt: input.fetched_at,
        sanitizedAt: input.sanitized_at,
        shouldExtract: input.label === 'SAFE_PUBLIC',
        error: input.error ?? null,
        sanitized: input.content?.sanitized ?? null,
        raw: input.input.raw ?? null,
        source: {
          name: input.source.name,
          collection: input.source.collection,
          url: input.source.url,
          id: input.source.id,
        },
        http: input.http
          ? {
              finalUrl: input.http.final_url ?? null,
              status: input.http.status ?? null,
              contentType: input.http.content_type ?? null,
              etag: input.http.etag ?? null,
              lastModified: input.http.last_modified ?? null,
              headers: input.http.headers ?? {},
            }
          : null,
        content: input.content
          ? {
              sha256: input.content.sha256,
              bytes: input.content.bytes,
            }
          : null,
      })
    },
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
