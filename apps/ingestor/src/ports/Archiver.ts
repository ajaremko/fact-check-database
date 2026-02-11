import { Context, Data, Effect } from 'effect'

import {
  FilePointer,
  FetchAttemptRecord,
  Metadata,
} from '@news-research/contracts'

import type { FetchAttempt } from '../data/FetchAttempt'

export class ArchiverError extends Data.TaggedError('ArchiverError')<{
  readonly cause: unknown
}> {}

export class Archiver extends Context.Tag('Archiver')<
  Archiver,
  {
    readonly archiveBody: (
      attempt: FetchAttempt,
      body: Uint8Array,
      contentType?: string
    ) => Effect.Effect<FilePointer, ArchiverError>
    readonly archiveRecord: (
      attempt: FetchAttempt,
      record: FetchAttemptRecord,
      metadata: Metadata
    ) => Effect.Effect<FilePointer, ArchiverError>
  }
>() {}
