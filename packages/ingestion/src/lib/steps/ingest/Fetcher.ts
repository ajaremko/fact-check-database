import { Context, Data, Effect } from 'effect'

import { FetchResult } from './FetchResult'

export class FetcherError extends Data.TaggedError('FetcherError')<{
  readonly cause: unknown
  readonly url: string
}> {}

export class Fetcher extends Context.Tag('Fetcher')<
  Fetcher,
  {
    readonly fetch: (
      name: string,
      collection: string,
      url: string
    ) => Effect.Effect<FetchResult, FetcherError>
  }
>() {}

export const { fetch } = Effect.serviceFunctions(Fetcher)
