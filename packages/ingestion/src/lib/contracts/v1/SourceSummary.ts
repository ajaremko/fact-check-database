import { Schema } from 'effect'

/** Source name and collection label shared across record types. */
export const SourceSummarySchema = Schema.Struct({
  name: Schema.String,
  collection: Schema.String, // "rss" | "api" | "html" | ...
})
