import { Context, Data, Effect } from 'effect'

import type { ObservationFetched } from '../domain/Observation'

export class PublisherError extends Data.TaggedError('PublisherError')<{
  readonly cause: unknown
}> {}

export class Publisher extends Context.Tag('Publisher')<
  Publisher,
  {
    readonly publish: (
      event: ObservationFetched
    ) => Effect.Effect<void, PublisherError>
  }
>() {}
