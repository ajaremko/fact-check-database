import { Context, Data, Effect } from 'effect'

import type { FetchResult } from './FetchResult'

export class FetcherError extends Data.TaggedError('FetcherError')<{
  readonly cause: unknown
}> {}

export class Fetcher extends Context.Tag('Fetcher')<
  Fetcher,
  {
    readonly fetch: (url: string) => Effect.Effect<FetchResult, FetcherError>
  }
>() {}
