import { Context, Data, Effect } from 'effect'

import { FilePointer, SanitizerRecord, ExtractedRow } from '../data'

export class ArchiverError extends Data.TaggedError('ArchiverError')<{
  readonly cause: unknown
}> {}

export class Archiver extends Context.Tag('Archiver')<
  Archiver,
  {
    readonly readSanitizedBody: (
      pointer: FilePointer
    ) => Effect.Effect<Uint8Array, ArchiverError>
    readonly readSanitizerRecord: (
      pointer: FilePointer
    ) => Effect.Effect<SanitizerRecord, ArchiverError>
    // readonly writeBatch: (
    //   baseDir: string,
    //   rows: readonly ExtractedRow[]
    // ) => Effect.Effect<FilePointer, ArchiverError>
  }
>() {}
