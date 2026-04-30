import { Schema } from 'effect'

import { FilePointerSchema } from '../shared'

/**
 * Schema for the event published by the ingestor per fetch attempt.
 *
 * One event is emitted regardless of whether the fetch succeeded or failed.
 * The `observationId` is a deterministic hash of the fetch outcome, enabling
 * deduplication across runs. The `pointer` field references the archived
 * ingestor record in cloud storage.
 */
export class ExtractionBatchReady extends Schema.Class<ExtractionBatchReady>(
  'ExtractionBatchReady'
)({
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
}) {}
