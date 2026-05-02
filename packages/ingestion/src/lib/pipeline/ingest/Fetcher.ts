import { Context, Data, Effect } from 'effect'

import { Source, Timestamp } from '../shared'

import { FetchResultSchema } from './FetchResult'

export class FetcherError extends Data.TaggedError('FetcherError')<{
  readonly cause: unknown
  readonly source: Source
}> {}

export class Fetcher extends Context.Tag('Fetcher')<
  Fetcher,
  {
    readonly fetch: (
      source: Source,
      timestamp: Timestamp
    ) => Effect.Effect<FetchResultSchema, FetcherError>
  }
>() {}

export const { fetch } = Effect.serviceFunctions(Fetcher)
