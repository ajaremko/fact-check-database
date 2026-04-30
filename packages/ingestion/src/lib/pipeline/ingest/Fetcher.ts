import { Context, Data, Effect } from 'effect'

import { Source } from '../shared'

import { FetchResult } from './FetchResult'

export class FetcherError extends Data.TaggedError('FetcherError')<{
  readonly cause: unknown
  readonly source: Source
}> {}

export class Fetcher extends Context.Tag('Fetcher')<
  Fetcher,
  {
    readonly fetch: (
      source: Source,
      timestamp: number
    ) => Effect.Effect<FetchResult, FetcherError>
  }
>() {}

export const { fetch } = Effect.serviceFunctions(Fetcher)
