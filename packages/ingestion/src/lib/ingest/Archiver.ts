import { Context, Data, Effect } from 'effect'

import { FilePointer, IngestionRecord, IngestionRecordMetadata } from '../data'

import { FetchAttempt } from './FetchAttempt'

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
      record: IngestionRecord,
      metadata: IngestionRecordMetadata
    ) => Effect.Effect<FilePointer, ArchiverError>
  }
>() {}
