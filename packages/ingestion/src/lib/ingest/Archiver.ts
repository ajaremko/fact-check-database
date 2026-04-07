import { Context, Data, Effect } from 'effect'

import { FilePointer, IngestionRecord, IngestionRecordMetadata } from '../data'

export class ArchiverError extends Data.TaggedError('ArchiverError')<{
  readonly cause: unknown
}> {}

export class Archiver extends Context.Tag('Archiver')<
  Archiver,
  {
    readonly archiveBody: (
      path: string,
      id: string,
      body: Uint8Array,
      contentType?: string
    ) => Effect.Effect<FilePointer, ArchiverError>
    readonly archiveRecord: (
      path: string,
      id: string,
      record: IngestionRecord,
      metadata: IngestionRecordMetadata
    ) => Effect.Effect<FilePointer, ArchiverError>
  }
>() {}
