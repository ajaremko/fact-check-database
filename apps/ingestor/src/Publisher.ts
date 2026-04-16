import { Context, Data, Effect } from 'effect'

import type { IngestionAttempted } from '../../../packages/ingestion/dist/lib/steps/ingest'

export class PublisherError extends Data.TaggedError('PublisherError')<{
  readonly cause: unknown
}> {}

export class Publisher extends Context.Tag('Publisher')<
  Publisher,
  {
    readonly publish: (
      event: IngestionAttempted
    ) => Effect.Effect<void, PublisherError>
  }
>() {}
