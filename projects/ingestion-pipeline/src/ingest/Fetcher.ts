import { Context, Data, Effect, Schema, flow } from 'effect'

import { Source, Timestamp } from '../shared'

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

export const FetchResultSchema = Schema.Union(
  FetchSuccessSchema,
  FetchFailureSchema
)

export type FetchResult = Schema.Schema.Type<typeof FetchResultSchema>

export class FetcherError extends Data.TaggedError('FetcherError')<{
  readonly cause: unknown
  readonly source: Source
  readonly message: string
}> {}

export class Fetcher extends Context.Tag('Fetcher')<
  Fetcher,
  {
    readonly fetch: (
      source: Source,
      timestamp: Timestamp
    ) => Effect.Effect<FetchResult, FetcherError>
  }
>() {}

const fetcher = Effect.serviceFunctions(Fetcher)

export const fetch = flow(fetcher.fetch, Effect.withSpan('fetch'))
