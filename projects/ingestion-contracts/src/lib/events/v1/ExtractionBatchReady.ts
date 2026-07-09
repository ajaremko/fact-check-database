import { Schema } from 'effect'

import { FilePointerSchema } from '../../shared/v1'

/**
 * Schema for the event published when a batch of extracted records (e.g.
 * fact checks) has been written to cloud storage and is ready for
 * downstream consumption.
 *
 * `pointer` references the batch file, `source_format` describes its
 * encoding (e.g. newline-delimited JSON), and `schema` carries the JSON
 * schema describing the shape of each record in the batch.
 */
export const ExtractionBatchReadySchema = Schema.Struct({
  version: Schema.Literal(1),
  extraction_batch_id: Schema.String,
  extracted_at: Schema.Number,
  pointer: FilePointerSchema,
  type: Schema.Literal('fact_checks'),
  source_format: Schema.Union(
    Schema.Literal('NEWLINE_DELIMITED_JSON'),
    Schema.String
  ),
  schema: Schema.Object,
})
