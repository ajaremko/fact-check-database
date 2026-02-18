import { Context, Data, Effect } from 'effect'

import { FilePointer, IngestionRecord } from '@news-research/contracts'

export class ArchiverError extends Data.TaggedError('ArchiverError')<{
  readonly cause: unknown
}> {}

export class Archiver extends Context.Tag('Archiver')<
  Archiver,
  {
    readonly readRawBody: (
      pointer: FilePointer
    ) => Effect.Effect<Uint8Array, ArchiverError>
    readonly readFetchAttemptRecord: (
      pointer: FilePointer
    ) => Effect.Effect<IngestionRecord.IngestionRecord, ArchiverError>
    readonly writeSanitizedBody: (
      id: string,
      body: Uint8Array,
      contentType?: string
    ) => Effect.Effect<FilePointer, ArchiverError>
    readonly writeSanitizerRecord: (
      id: string,
      record: IngestionRecord.IngestionRecord,
      metadata: IngestionRecord.IngestionRecordMetadata
    ) => Effect.Effect<FilePointer, ArchiverError>
  }
>() {}
