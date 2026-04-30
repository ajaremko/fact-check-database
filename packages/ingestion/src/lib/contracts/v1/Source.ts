import { Schema } from 'effect'

/**
 * An ingestion source.
 */
export const SourceSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  url: Schema.String,
  collection: Schema.String,
})

export type Source = Schema.Schema.Type<typeof SourceSchema>
