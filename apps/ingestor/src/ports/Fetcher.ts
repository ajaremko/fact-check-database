import { Context, Data, Effect } from 'effect'

import type { Observation } from '../domain/Observation'
import type { SourceTarget } from '../domain/SourceTarget'

export class FetcherError extends Data.TaggedError('FetcherError')<{
  readonly raw: unknown
}> {}

export type WriteRawOpts = {
  sourceName: string
  url: string
}

export class Fetcher extends Context.Tag('Fetcher')<
  Fetcher,
  {
    readonly fetch: (
      target: SourceTarget
    ) => Effect.Effect<Observation, FetcherError>
  }
>() {}
