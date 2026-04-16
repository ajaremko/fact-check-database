import { Context, Data, Effect } from 'effect'

import { FilePointer } from '../data'

export class StorageWriteError extends Data.TaggedError('StorageWriteError')<{
  readonly cause: unknown
  readonly path: string
  readonly bucket: string
}> {}

export class StorageWriter extends Context.Tag('StorageWriter')<
  StorageWriter,
  {
    readonly write: (options: {
      path: string
      data: Uint8Array
      meta?: Record<string, unknown>
      contentType?: string
    }) => Effect.Effect<FilePointer, StorageWriteError>
  }
>() {}
