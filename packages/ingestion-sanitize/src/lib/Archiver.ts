import { Context, Data, Effect } from 'effect'

import {
  FilePointer,
  IngestorRecord,
  SantizerRecord,
} from '@news-research/contracts'

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
    ) => Effect.Effect<IngestorRecord.IngestionRecord, ArchiverError>
    readonly writeSanitizedBody: (
      id: string,
      body: Uint8Array,
      contentType?: string
    ) => Effect.Effect<FilePointer, ArchiverError>
    readonly writeSanitizerRecord: (
      record: SantizerRecord.SanitizerRecord,
      metadata: SantizerRecord.SantizerRecordMetadata
    ) => Effect.Effect<FilePointer, ArchiverError>
  }
>() {}
