import { Schema } from 'effect'

export class FetchFailure extends Schema.TaggedClass<FetchFailure>()(
  'FetchFailure',
  {
    error: Schema.String,
    source: Schema.Struct({
      name: Schema.String,
      collection: Schema.String,
    }),
    fetchedAt: Schema.Number,
    url: Schema.String,
  }
) {}

export class FetchSuccess extends Schema.TaggedClass<FetchSuccess>()(
  'FetchSuccess',
  {
    finalUrl: Schema.String,
    status: Schema.Number,
    source: Schema.Struct({
      name: Schema.String,
      collection: Schema.String,
    }),
    headers: Schema.Record({ key: Schema.String, value: Schema.String }),
    etag: Schema.optional(Schema.String),
    lastModified: Schema.optional(Schema.String),
    contentType: Schema.optional(Schema.String),
    bytes: Schema.Number,
    sha256: Schema.String,
    body: Schema.instanceOf(Uint8Array),
    error: Schema.NullOr(Schema.String),
    fetchedAt: Schema.Number,
    url: Schema.String,
  }
) {}

export const FetchResult = Schema.Union(FetchSuccess, FetchFailure)

export type FetchResult = Schema.Schema.Type<typeof FetchResult>
