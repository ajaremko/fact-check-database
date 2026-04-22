import { Schema, ParseResult } from 'effect'

import * as v1 from '../../contracts/v1'

import { FetchResult } from './FetchResult'

export class Observation extends Schema.TaggedClass<Observation>()(
  'Observation',
  {
    observationId: Schema.String,
    ingestionId: Schema.String,
    result: FetchResult,
    pointer: Schema.NullOr(
      Schema.Struct({
        bucket: Schema.String,
        object: Schema.String,
      })
    ),
  }
) {}

export const ObservationSchema = Schema.transformOrFail(
  v1.IngestionRecordSchema,
  Observation,
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding Observations not implemented'
        )
      ),
    encode: (input) => {
      switch (input.result._tag) {
        case 'FetchSuccess':
          return ParseResult.succeed({
            version: 1,
            kind: 'fetch_attempt' as const,
            outcome: 'data_fetched' as const,
            observation_id: input.observationId,
            ingestion_id: input.ingestionId,
            fetched_at: input.result.fetchedAt,
            url: input.result.url,
            source: input.result.source,
            http: {
              status: input.result.status,
              headers: input.result.headers,
              ...(input.result.contentType
                ? { content_type: input.result.contentType }
                : {}),
              ...(input.result.etag ? { etag: input.result.etag } : {}),
              ...(input.result.lastModified
                ? { last_modified: input.result.lastModified }
                : {}),
            },
            content: {
              sha256: input.result.sha256,
              bytes: input.result.bytes,
            },
            ...(input.pointer
              ? {
                  pointer: {
                    bucket: input.pointer.bucket,
                    object: input.pointer.object,
                  },
                }
              : {}),
          })
        case 'FetchFailure':
          return ParseResult.succeed({
            version: 1,
            kind: 'fetch_attempt' as const,
            outcome: 'no_response' as const,
            observation_id: input.observationId,
            ingestion_id: input.ingestionId,
            fetched_at: input.result.fetchedAt,
            url: input.result.url,
            source: input.result.source,
            error: input.result.error,
          })
      }
    },
  }
)

export const ObservationMetadataSchema = Schema.transformOrFail(
  v1.IngestionRecordMetadataSchema,
  Observation,
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding ObservationMetadata not implemented'
        )
      ),
    encode: (input) => {
      return ParseResult.succeed({
        observationId: input.observationId,
        ingestionId: input.ingestionId,
        fetchedAt: input.result.fetchedAt,
        url: input.result.url,
        sourceName: input.result.source.name,
        sourceCollection: input.result.source.collection,
      })
    },
  }
)

export type ObservationMetadata = Schema.Schema.Type<
  typeof ObservationMetadataSchema
>

export const ObservationPathSchema = Schema.transformOrFail(
  v1.ArchivePathSchema,
  Observation,
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding ArchivePath not implemented'
        )
      ),
    encode: (input) =>
      ParseResult.succeed({
        version: 1 as const,
        collectionName: 'records',
        ext: `ingestion.yml`,
        sourceName: input.result.source.name,
        date: input.result.fetchedAt,
        ingestionId: input.ingestionId,
        observationId: input.observationId,
      }),
  }
)
