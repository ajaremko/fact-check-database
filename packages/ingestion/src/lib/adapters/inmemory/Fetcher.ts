import { Effect, Layer } from 'effect'

import { Fetcher } from '../../pipeline/ingest'

type FetchResult = Effect.Effect.Success<ReturnType<typeof Fetcher.fetch>>

export function layer(result: FetchResult) {
  return Layer.succeed(Fetcher.Fetcher, {
    fetch: () => Effect.succeed(result),
  })
}
