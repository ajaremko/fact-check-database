import { Context, Data, Effect } from 'effect'

import { FilePointer, IngestorRecord } from '@news-research/contracts'

import { FetchAttempt } from '../data/FetchAttempt'

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
      record: IngestorRecord.IngestionRecord,
      metadata: IngestorRecord.IngestionRecordMetadata
    ) => Effect.Effect<FilePointer, ArchiverError>
  }
>() {}
