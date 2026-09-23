import { Schema, ParseResult } from 'effect'

import {
  ArchivePathSchema,
  FilePointerSchema,
  IngestionRecordSchema,
  IngestionRecordMetadataSchema,
} from '@fact-check-database/ingestion-contracts/archive/v1'
import { SourceConfigSchema } from '@fact-check-database/ingestion-contracts/config/v1'
import { TimestampSchema } from '@fact-check-database/ingestion-contracts/shared/v1'

import { FetchResultSchema } from '../ports/Fetcher'

/**
 * One fetch attempt: the result of fetching `source` once during the ingestor
 * run `ingestorRunId`. The pair (`source.id`, `ingestorRunId`) identifies the
 * attempt; there is no separate id.
 */
export class Observation extends Schema.Class<Observation>('Observation')({
  ingestorRunId: Schema.String,
  fetchedAt: TimestampSchema,
  result: FetchResultSchema,
  source: SourceConfigSchema,
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
            ingestor_run_id: input.ingestorRunId,
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
            ingestor_run_id: input.ingestorRunId,
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
        ingestorRunId: input.ingestorRunId,
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
        sourceId: input.source.id,
        date: input.fetchedAt,
        ingestorRunId: input.ingestorRunId,
        fileName: 'fetch_attempt',
      }),
  }
)
