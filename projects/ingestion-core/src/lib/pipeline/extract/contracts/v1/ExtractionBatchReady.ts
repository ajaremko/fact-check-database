import { Schema } from 'effect'

import { FilePointerSchema } from '../../../shared/contracts/v1'

const fields = {
  name: Schema.String,
  type: Schema.String,
  mode: Schema.String,
}

interface BigQueryTableSchemaFieldSchema
  extends Schema.Struct.Type<typeof fields> {
  readonly fields?: ReadonlyArray<BigQueryTableSchemaFieldSchema>
}

const BigQueryTableSchemaFieldSchema = Schema.Struct({
  ...fields,
  fields: Schema.optional(
    Schema.Array(
      Schema.suspend(
        (): Schema.Schema<BigQueryTableSchemaFieldSchema> =>
          BigQueryTableSchemaFieldSchema
      )
    )
  ),
})

export const BigQueryTableSchemaSchema = Schema.Struct({
  fields: Schema.Array(BigQueryTableSchemaFieldSchema),
})

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
  schema: BigQueryTableSchemaSchema,
})
