import { ParseResult, Schema } from 'effect'

import { omitNullKeys } from '@news-research/ingestion-data'

import { FilePointerSchema } from '../shared'

import {
  ExtractionBatchReadySchema,
  FactChecksTableSchema,
  StagingPathSchema,
} from './contracts/v1'

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
  table: Schema.Struct({
    tableId: Schema.String,
    datasetId: Schema.String,
  }),
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
    tableId: Schema.String,
    datasetId: Schema.String,
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
        datasetId: input.datasetId,
        tableId: input.tableId,
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
            table: {
              table_id: input.table.tableId,
              dataset_id: input.table.datasetId,
            },
            schema: FactChecksTableSchema,
          })
        )
      )
    },
  }
)
