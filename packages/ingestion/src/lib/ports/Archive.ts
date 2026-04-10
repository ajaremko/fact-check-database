import { Context, Data, Effect } from 'effect'

import { FilePointer } from '../data'

export class ArchiveError extends Data.TaggedError('ArchiveError')<{
  readonly cause: unknown
}> {}

export class Archive extends Context.Tag('Archive')<
  Archive,
  {
    readonly read: (
      pointer: FilePointer
    ) => Effect.Effect<Uint8Array, ArchiveError>
    readonly write: (options: {
      path: string
      data: Uint8Array
      meta?: Record<string, unknown>
      contentType?: string
    }) => Effect.Effect<FilePointer, ArchiveError>
  }
>() {}
