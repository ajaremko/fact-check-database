import { Context, Data, Effect } from 'effect'

import { FetchResult } from './FetchResult'

export class FetcherError extends Data.TaggedError('FetcherError')<{
  readonly cause: unknown
  readonly source: {
    id: string
    name: string
    collection: 'rss' | 'atom'
    url: string
  }
}> {}

export class Fetcher extends Context.Tag('Fetcher')<
  Fetcher,
  {
    readonly fetch: (
      source: {
        id: string
        name: string
        collection: 'rss' | 'atom'
        url: string
      },
      timestamp: number
    ) => Effect.Effect<FetchResult, FetcherError>
  }
>() {}

export const { fetch } = Effect.serviceFunctions(Fetcher)
