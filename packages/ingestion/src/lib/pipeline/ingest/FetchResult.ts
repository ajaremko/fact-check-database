import { Schema } from 'effect'

export class FetchFailure extends Schema.TaggedClass<FetchFailure>()(
  'FetchFailure',
  {
    error: Schema.String,
    fetchedAt: Schema.Number,
  }
) {}

export class FetchSuccess extends Schema.TaggedClass<FetchSuccess>()(
  'FetchSuccess',
  {
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
    fetchedAt: Schema.Number,
  }
) {}

export const FetchResult = Schema.Union(FetchSuccess, FetchFailure)

export type FetchResult = Schema.Schema.Type<typeof FetchResult>
