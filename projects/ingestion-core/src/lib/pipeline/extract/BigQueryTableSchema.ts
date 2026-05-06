import { Schema } from 'effect'

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
