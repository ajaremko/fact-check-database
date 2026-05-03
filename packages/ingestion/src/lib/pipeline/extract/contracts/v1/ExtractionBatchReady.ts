import { Schema } from 'effect'

import { FilePointerSchema } from '../../../shared/contracts/v1'

/**
 * Schema for the event published by the ingestor per fetch attempt.
 *
 * One event is emitted regardless of whether the fetch succeeded or failed.
 * The `observationId` is a deterministic hash of the fetch outcome, enabling
 * deduplication across runs. The `pointer` field references the archived
 * ingestor record in cloud storage.
 */
export const ExtractionBatchReadySchema = Schema.Struct({
  version: Schema.Literal(1),
  extraction_batch_id: Schema.String,
  extracted_at: Schema.Number,
  pointer: FilePointerSchema,
  table: Schema.Struct({
    table_id: Schema.String,
    dataset_id: Schema.String,
  }),
  source_format: Schema.Union(
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
