import { Schema } from 'effect'

export const SourceCollectionSchema = Schema.Literal('atom', 'rss')

export type SourceCollection = Schema.Schema.Type<typeof SourceCollectionSchema>

/**
 * An ingestion source.
 */
export const SourceSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  url: Schema.String,
  collection: SourceCollectionSchema,
})

export type Source = Schema.Schema.Type<typeof SourceSchema>
