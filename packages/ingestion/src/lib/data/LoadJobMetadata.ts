import { Schema } from 'effect'

export const LoadJobMetadataFieldTypeSchema = Schema.Literal(
  'STRING',
  'BYTES',
  'INTEGER',
  'FLOAT',
  'BOOLEAN',
  'TIMESTAMP',
  'DATE',
  'TIME',
  'DATETIME',
  'GEOGRAPHY',
  'NUMERIC',
  'BIGNUMERIC',
  'JSON',
  'STRUCT',
  'RANGE'
)

export type LoadJobMetadataFieldType = Schema.Schema.Type<
  typeof LoadJobMetadataFieldTypeSchema
>

export const LoadJobMetadataFieldModeSchema = Schema.Literal(
  'NULLABLE',
  'REQUIRED',
  'REPEATED'
)

const fields = {
  name: Schema.String,
  type: LoadJobMetadataFieldTypeSchema,
  mode: Schema.optional(LoadJobMetadataFieldModeSchema),
}

export interface LoadJobMetadataFieldSchema
  extends Schema.Struct.Type<typeof fields> {
  readonly fields?: ReadonlyArray<LoadJobMetadataFieldSchema>
}

export const LoadJobMetadataFieldSchema = Schema.Struct({
  ...fields,
  fields: Schema.optional(
    Schema.Array(
      Schema.suspend(
        (): Schema.Schema<LoadJobMetadataFieldSchema> =>
          LoadJobMetadataFieldSchema
      )
    )
  ),
})

export const LoadJobMetadataSchema = Schema.Struct({
  sourceFormat: Schema.Union(
    Schema.Literal('NEWLINE_DELIMITED_JSON'),
    Schema.String
  ),
  schema: Schema.Struct({
    fields: Schema.Array(LoadJobMetadataFieldSchema),
  }),
})

export type LoadJobMetadata = Schema.Schema.Type<typeof LoadJobMetadataSchema>
