import { Schema } from 'effect'

/**
 * HTTP response metadata included in sanitized records.
 * `headers` is optional — many pipelines omit it entirely in sanitized outputs.
 */
export const HttpSummarySchema = Schema.Struct({
  status: Schema.Number,
  content_type: Schema.optional(Schema.String),
  etag: Schema.optional(Schema.String),
  last_modified: Schema.optional(Schema.String),
  headers: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.String })
  ),
})
