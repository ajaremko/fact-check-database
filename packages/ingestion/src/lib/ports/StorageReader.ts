import { Context, Data, Effect } from 'effect'

import { FilePointer } from '../data'

export class StorageReadError extends Data.TaggedError('StorageReadError')<{
  readonly cause: unknown
}> {}

export class StorageReader extends Context.Tag('StorageReader')<
  StorageReader,
  {
    readonly read: (
      pointer: FilePointer
    ) => Effect.Effect<Uint8Array, StorageReadError>
  }
>() {}
