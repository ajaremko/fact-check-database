import { Context, Data, Effect } from 'effect'

import type { ArchivePointer } from '../domain/Observation'
import type { FetchAttempt } from '../domain/FetchAttempt'

export class ArchiverError extends Data.TaggedError('ArchiverError')<{
  readonly cause: unknown
}> {}

export class Archiver extends Context.Tag('Archiver')<
  Archiver,
  {
    readonly archive: (
      attempt: FetchAttempt
    ) => Effect.Effect<ArchivePointer, ArchiverError>
  }
>() {}
