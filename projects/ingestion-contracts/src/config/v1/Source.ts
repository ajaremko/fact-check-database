import { Schema } from 'effect'

export const SourceCollectionConfigSchema = Schema.Literal('atom', 'rss')

export type SourceCollectionConfig = Schema.Schema.Type<
  typeof SourceCollectionConfigSchema
>

/**
 * Configuration for an ingestion source.
 */
export const SourceConfigSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  url: Schema.String,
  collection: SourceCollectionConfigSchema,
})

export type SourceConfig = Schema.Schema.Type<typeof SourceConfigSchema>
export type SourceConfigEncoded = Schema.Schema.Encoded<
  typeof SourceConfigSchema
>
