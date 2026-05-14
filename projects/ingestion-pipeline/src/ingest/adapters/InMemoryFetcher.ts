import { Effect, Layer } from 'effect'

import { Fetcher, FetchResult } from '../Fetcher'

export function layer(result: FetchResult) {
  return Layer.succeed(Fetcher, {
    fetch: () => Effect.succeed(result),
  })
}
