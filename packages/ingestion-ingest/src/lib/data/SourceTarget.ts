import { Schema } from 'effect'

export const SourceTargetSchema = Schema.Struct({
  name: Schema.String,
  url: Schema.String,
  collection: Schema.String, // "csv" | "rss" | "gdelt" later
})

export type SourceTarget = Schema.Schema.Type<typeof SourceTargetSchema>
