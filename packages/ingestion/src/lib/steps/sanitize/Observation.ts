import { Schema, ParseResult } from 'effect'

import * as v1 from '../../contracts/v1'

export class Observation extends Schema.Class<Observation>('Observation')({
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
  raw: Schema.NullOr(
    Schema.Struct({
      http: Schema.Struct({
        status: Schema.Number,
        contentType: Schema.optional(Schema.String),
        etag: Schema.optional(Schema.String),
        lastModified: Schema.optional(Schema.String),
        headers: Schema.Record({ key: Schema.String, value: Schema.String }),
      }),
      content: Schema.Struct({
        sha256: Schema.String,
        bytes: Schema.Number,
      }),
      pointer: Schema.Struct({
        bucket: Schema.String,
        object: Schema.String,
      }),
    })
  ),
}) {}

export const ObservationSchema = Schema.transformOrFail(
  v1.IngestionRecordSchema,
  Observation,
  {
    strict: true,
    decode: (input) => {
      if (
        typeof input.http === 'undefined' ||
        typeof input.content === 'undefined' ||
        typeof input.pointer === 'undefined'
      ) {
        return ParseResult.succeed({
          observationId: input.observation_id,
          ingestionId: input.ingestion_id,
          fetchedAt: input.fetched_at,
          error: input.error,
          url: input.url,
          finalUrl: input.final_url,
          raw: null,
          source: {
            name: input.source.name,
            collection: input.source.collection,
          },
        })
      }
      return ParseResult.succeed({
        observationId: input.observation_id,
        ingestionId: input.ingestion_id,
        fetchedAt: input.fetched_at,
        error: input.error,
        url: input.url,
        finalUrl: input.final_url,
        source: {
          name: input.source.name,
          collection: input.source.collection,
        },
        raw: {
          http: {
            status: input.http.status,
            headers: input.http.headers ?? {},
            ...(typeof input.http.content_type !== 'undefined'
              ? { contentType: input.http.content_type }
              : {}),
            ...(typeof input.http.etag !== 'undefined'
              ? { etag: input.http.etag }
              : {}),
            ...(typeof input.http.last_modified !== 'undefined'
              ? { lastModified: input.http.last_modified }
              : {}),
          },
          content: {
            sha256: input.content.sha256,
            bytes: input.content.bytes,
          },
          pointer: input.pointer,
        },
      })
    },
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
