import { Context, Data, Effect } from 'effect'

import type { SanitizationAttempted } from '@news-research/ingestion/sanitize'

export class PublisherError extends Data.TaggedError('PublisherError')<{
  readonly cause: unknown
}> {}

export class Publisher extends Context.Tag('Publisher')<
  Publisher,
  {
    readonly publish: (
      event: SanitizationAttempted
    ) => Effect.Effect<void, PublisherError>
  }
>() {}
