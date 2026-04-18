import { Effect, Layer } from 'effect'

import { Fetcher } from '../../steps/ingest'

export function layer(result: Fetcher.FetchResult) {
  return Layer.succeed(Fetcher.Fetcher, {
    fetch: () => Effect.succeed(result),
  })
}
