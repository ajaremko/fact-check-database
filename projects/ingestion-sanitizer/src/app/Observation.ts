import { Schema, ParseResult } from 'effect'

import {
  SourceCollectionSchema,
  SourceSchema,
  TimestampSchema,
  IngestionRecordSchema,
} from '@news-research/ingestion-contracts'

import { FilePointerSchema } from '@news-research/core-io'

export class Observation extends Schema.Class<Observation>('Observation')({
  observationId: Schema.String,
  ingestionId: Schema.String,
  fetchedAt: TimestampSchema,
  error: Schema.NullOr(Schema.String),
  source: SourceSchema,
  raw: Schema.NullOr(
    Schema.Struct({
      http: Schema.Struct({
        status: Schema.Number,
        finalUrl: Schema.NullOr(Schema.String),
        contentType: Schema.NullOr(Schema.String),
        etag: Schema.NullOr(Schema.String),
        lastModified: Schema.NullOr(Schema.String),
        headers: Schema.Record({ key: Schema.String, value: Schema.String }),
      }),
      content: Schema.Struct({
        sha256: Schema.String,
        bytes: Schema.Number,
      }),
      pointer: FilePointerSchema,
    })
  ),
}) {}

const isSourceCollection = Schema.is(SourceCollectionSchema)

export const ObservationSchema = Schema.transformOrFail(
  IngestionRecordSchema,
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
      if (
        typeof input.status === 'undefined' ||
        typeof input.content === 'undefined'
      ) {
        return ParseResult.succeed({
          observationId: input.content_lineage_id,
          ingestionId: input.ingestion_batch_id,
          fetchedAt: input.fetched_at,
          error: input.error ?? null,
          finalUrl: input.final_url ?? null,
          raw: null,
          source: {
            id: input.source.id,
            url: input.source.url,
            name: input.source.name,
            collection: input.source.collection,
          },
        })
      }
      return ParseResult.succeed({
        observationId: input.content_lineage_id,
        ingestionId: input.ingestion_batch_id,
        fetchedAt: input.fetched_at,
        error: input.error ?? null,
        source: {
          id: input.source.id,
          url: input.source.url,
          name: input.source.name,
          collection: input.source.collection,
        },
        raw: input.status
          ? {
              http: {
                finalUrl: input.final_url ?? null,
                status: input.status,
                headers: input.headers ?? {},
                contentType: input.content_type ?? null,
                etag: input.etag ?? null,
                lastModified: input.last_modified ?? null,
              },
              content: {
                sha256: input.content.sha256,
                bytes: input.content.bytes,
              },
              pointer: input.content.raw,
            }
          : null,
      })
    },
    encode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Encoding Observation not implemented'
        )
      ),
  }
)
