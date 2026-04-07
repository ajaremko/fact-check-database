import { Context, Data, Effect } from 'effect'

import {
  FilePointer,
  IngestionRecord,
  SanitizerRecord,
  SanitizerRecordMetadata,
} from '../data'

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
    ) => Effect.Effect<IngestionRecord, ArchiverError>
    readonly writeSanitizedBody: (
      baseDir: string,
      id: string,
      body: Uint8Array,
      contentType?: string
    ) => Effect.Effect<FilePointer, ArchiverError>
    readonly writeSanitizerRecord: (
      baseDir: string,
      record: SanitizerRecord,
      metadata: SanitizerRecordMetadata
    ) => Effect.Effect<FilePointer, ArchiverError>
  }
>() {}
