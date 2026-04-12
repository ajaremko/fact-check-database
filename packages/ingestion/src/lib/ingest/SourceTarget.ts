import { Schema } from 'effect'

export const SourceTargetSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  url: Schema.String,
  collection: Schema.String, // "csv" | "rss" | "gdelt" later
})

export type SourceTarget = Schema.Schema.Type<typeof SourceTargetSchema>
