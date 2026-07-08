import { ParseResult, Schema } from 'effect'

import {
  FactChecksTableDBSchema,
  StagingPathSchema,
} from '@news-research/core-contracts'
import { omitNullKeys } from '@news-research/core-data'

import { FilePointerSchema } from '@news-research/core-io'

import { ExtractionBatchReadySchema } from './contracts/v1'

/**
 * Schema for the event published by the ingestor per fetch attempt.
 *
 * One event is emitted regardless of whether the fetch succeeded or failed.
 * The `observationId` is a deterministic hash of the fetch outcome, enabling
 * deduplication across runs. The `pointer` field references the archived
 * ingestor record in cloud storage.
 */
export const ExtractionBatchSchema = Schema.Struct({
  batchId: Schema.String,
  extractedAt: Schema.Number,
  pointer: FilePointerSchema,
  type: Schema.Literal('fact_checks'),
  sourceFormat: Schema.Union(
    Schema.Literal('NEWLINE_DELIMITED_JSON'),
    Schema.String
  ),
})

export const ExtractionBatchPathSchema = Schema.transformOrFail(
  StagingPathSchema,
  Schema.Struct({
    batchId: Schema.String,
    extractedAt: Schema.Number,
    type: Schema.Literal('fact_checks'),
  }),
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding ExtractionBatchPath not implemented'
        )
      ),
    encode: (input) => {
      return ParseResult.succeed({
        version: 1,
        type: input.type,
        ext: 'batch.ndjson',
        date: input.extractedAt,
        extractionId: input.batchId,
      })
    },
  }
)

export const ExtractionBatchEventSchema = Schema.transformOrFail(
  ExtractionBatchReadySchema,
  ExtractionBatchSchema,
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding ExtractionBatchEvent not implemented'
        )
      ),
    encode: (input) => {
      return ParseResult.succeed(
        ExtractionBatchReadySchema.make(
          omitNullKeys({
            version: 1,
            extraction_batch_id: input.batchId,
            extracted_at: input.extractedAt,
            source_format: input.sourceFormat,
            pointer: input.pointer,
            type: input.type,
            schema: FactChecksTableDBSchema,
          })
        )
      )
    },
  }
)
