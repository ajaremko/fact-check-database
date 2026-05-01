import { Schema } from 'effect'

export const FetchFailureSchema = Schema.TaggedStruct('FetchFailure', {
  error: Schema.String,
})

export const FetchSuccessSchema = Schema.TaggedStruct('FetchSuccess', {
  finalUrl: Schema.String,
  status: Schema.Number,
  headers: Schema.Record({ key: Schema.String, value: Schema.String }),
  etag: Schema.NullOr(Schema.String),
  lastModified: Schema.NullOr(Schema.String),
  contentType: Schema.NullOr(Schema.String),
  bytes: Schema.Number,
  sha256: Schema.String,
  body: Schema.instanceOf(Uint8Array),
  error: Schema.NullOr(Schema.String),
})

export const FetchResult = Schema.Union(FetchSuccessSchema, FetchFailureSchema)

export type FetchResult = Schema.Schema.Type<typeof FetchResult>
