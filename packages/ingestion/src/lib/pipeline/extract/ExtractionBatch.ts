import { ParseResult, Schema } from 'effect'

import * as v1 from '../../contracts/v1'
import { omitNullKeys } from '../../data'

import { FilePointerSchema } from '../shared'

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
  schema: Schema.Struct({
    fields: Schema.Array(
      Schema.Struct({
        name: Schema.String,
        type: Schema.String,
        mode: Schema.String,
      })
    ),
  }),
})

export const ExtractionBatchEventSchema = Schema.transformOrFail(
  v1.ExtractionBatchReadySchema,
  ExtractionBatchSchema,
  {
    strict: true,
    decode: (input, _, ast) =>
      ParseResult.fail(
        new ParseResult.Forbidden(
          ast,
          input,
          'Decoding ObservationEvent not implemented'
        )
      ),
    encode: (input) => {
      return ParseResult.succeed(
        v1.ExtractionBatchReadySchema.make(
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
            schema: {
              fields: input.schema.fields.map((field) => ({
                name: field.name,
                type: field.type,
                mode: field.mode,
              })),
            },
          })
        )
      )
    },
  }
)
