import { Schema } from 'effect'

export const SearchResultSchema = Schema.Struct({
  objectID: Schema.String,
  content_type: Schema.optional(Schema.String),
  content_length: Schema.optional(Schema.String),
  final_url: Schema.optional(Schema.String),
  extracted_at: Schema.DateFromString,
  source_collection: Schema.String,
  source_id: Schema.String,
  source_url: Schema.String,
  source_name: Schema.String,
  image_url: Schema.optional(Schema.String),
  canonical_url: Schema.optional(Schema.String),
  language: Schema.optional(Schema.String),
  link: Schema.optional(Schema.String),
  // The publication date as a parsed date: an ISO 8601 string in the index
  published_at_normalized: Schema.optional(Schema.DateFromString),
  // The publication date exactly as the publisher wrote it. Kept as written,
  // including a string that can't be parsed as a date
  published_at_raw: Schema.optional(Schema.String),
  // `published_at_normalized` as Unix seconds. The search indices rank on
  // it: a number is what the index needs to sort by date. Absent when the
  // fact check has no parsed publication date
  published_at_timestamp: Schema.optional(Schema.Number),
  summary: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  author: Schema.optional(Schema.String),
  categories: Schema.optional(Schema.Array(Schema.String)),
})

export type SearchResult = Schema.Schema.Type<typeof SearchResultSchema>
