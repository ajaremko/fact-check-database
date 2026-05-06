import { Schema } from 'effect'

import { FilePointerSchema } from '../../../shared/contracts/v1'

const fields = {
  name: Schema.String,
  type: Schema.String,
  mode: Schema.String,
}

export interface BigQueryTableSchemaFieldSchema
  extends Schema.Struct.Type<typeof fields> {
  readonly fields?: ReadonlyArray<BigQueryTableSchemaFieldSchema>
}

export const BigQueryTableSchemaFieldSchema = Schema.Struct({
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

/**
 * Confusingly but accurately named, this is an effect schema for a BigQuery table schema.
 * Bigquery table schemas are JSON objects that describe the structure of a BigQuery table,
 * and this effect schema is used to decode and validate those JSON objects.
 * These data are included as metadata about the extracted table rows
 */
export const BigQueryTableSchemaSchema = Schema.Struct({
  fields: Schema.Array(BigQueryTableSchemaFieldSchema),
})

export type BigQueryTableSchema = Schema.Schema.Type<
  typeof BigQueryTableSchemaSchema
>

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
