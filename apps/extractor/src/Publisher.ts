import { Context, Data, Effect } from 'effect'

import type { ExtractionBatchReady } from '@news-research/ingestion/extract'

export class PublisherError extends Data.TaggedError('PublisherError')<{
  readonly cause: unknown
}> {}

export class Publisher extends Context.Tag('Publisher')<
  Publisher,
  {
    readonly publish: (
      event: ExtractionBatchReady
    ) => Effect.Effect<void, PublisherError>
  }
>() {}
