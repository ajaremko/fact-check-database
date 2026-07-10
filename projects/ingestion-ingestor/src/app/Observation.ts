import { Schema, ParseResult } from 'effect'

import {
  ArchivePathSchema,
  FilePointerSchema,
  IngestionRecordSchema,
  IngestionRecordMetadataSchema,
} from '@news-research/ingestion-contracts/archive/v1'
import { TimestampSchema } from '@news-research/ingestion-contracts/shared/v1'

import { SourceSchema } from '../contracts/Source'
import { FetchResultSchema } from '../ports/Fetcher'

export class Observation extends Schema.Class<Observation>('Observation')({
  observationId: Schema.String,
  ingestionId: Schema.String,
  fetchedAt: TimestampSchema,
  result: FetchResultSchema,
  source: SourceSchema,
  pointer: Schema.NullOr(FilePointerSchema),
}) {}

export const ObservationSchema = Schema.transformOrFail(
  IngestionRecordSchema,
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
            content_lineage_id: input.observationId,
            ingestion_batch_id: input.ingestionId,
            fetched_at: input.fetchedAt,
            source: input.source,
            status: input.result.status,
            headers: input.result.headers,
            ...(input.result.contentType
              ? { content_type: input.result.contentType }
              : {}),
            ...(input.result.etag ? { etag: input.result.etag } : {}),
            ...(input.result.lastModified
              ? { last_modified: input.result.lastModified }
              : {}),
            ...(input.pointer
              ? {
                  content: {
                    sha256: input.result.sha256,
                    bytes: input.result.bytes,
                    raw: {
                      bucket: input.pointer.bucket,
                      object: input.pointer.object,
                    },
                  },
                }
              : {}),
          })
        case 'FetchFailure':
          return ParseResult.succeed({
            version: 1,
            kind: 'fetch_attempt' as const,
            outcome: 'no_response' as const,
            content_lineage_id: input.observationId,
            ingestion_batch_id: input.ingestionId,
            fetched_at: input.fetchedAt,
            source: input.source,
            error: input.result.error,
          })
      }
    },
  }
)

export const ObservationMetadataSchema = Schema.transformOrFail(
  IngestionRecordMetadataSchema,
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
        fetchedAt: input.fetchedAt,
        url: input.source.url,
        sourceName: input.source.name,
        sourceCollection: input.source.collection,
      })
    },
  }
)

export type ObservationMetadata = Schema.Schema.Type<
  typeof ObservationMetadataSchema
>

export const ObservationPathSchema = Schema.transformOrFail(
  ArchivePathSchema,
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
        collectionName: 'records/ingestion',
        ext: `yml`,
        sourceName: input.source.name,
        date: input.fetchedAt,
        ingestionId: input.ingestionId,
        observationId: input.observationId,
      }),
  }
)
