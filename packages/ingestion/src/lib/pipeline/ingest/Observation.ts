import { Schema, ParseResult } from 'effect'

import * as v1 from '../../contracts/v1'
import { omitNullKeys } from '../../data'

import {
  SourceSchema,
  FilePointerSchema,
  FilePointer,
  TimestampSchema,
} from '../shared'

import { FetchResult } from './FetchResult'

export class Observation extends Schema.TaggedClass<Observation>()(
  'Observation',
  {
    observationId: Schema.String,
    ingestionId: Schema.String,
    fetchedAt: TimestampSchema,
    result: FetchResult,
    source: SourceSchema,
    pointer: Schema.NullOr(FilePointerSchema),
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
        sourceName: input.source.name,
        date: input.fetchedAt,
        ingestionId: input.ingestionId,
        observationId: input.observationId,
      }),
  }
)

export function buildEventFromObservation(
  input: Observation,
  pointer: FilePointer
) {
  switch (input.result._tag) {
    case 'FetchSuccess':
      return v1.ObservationIngestedSchema.make(
        omitNullKeys({
          version: 1,
          content_lineage_id: input.observationId,
          ingestion_batch_id: input.ingestionId,
          fetched_at: input.fetchedAt,
          source: input.source,
          status: input.result.status,
          final_url: input.result.finalUrl,
          content_type: input.result.contentType,
          etag: input.result.etag,
          last_modified: input.result.lastModified,
          content_sha256: input.result.sha256,
          content_bytes: input.result.bytes,
          pointer,
        })
      )
    case 'FetchFailure':
      return v1.ObservationIngestedSchema.make({
        version: 1,
        content_lineage_id: input.observationId,
        ingestion_batch_id: input.ingestionId,
        fetched_at: input.fetchedAt,
        source: input.source,
        error: input.result.error,
        pointer,
      })
  }
}
