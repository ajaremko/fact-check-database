import { Context, Data, Effect, flow } from 'effect'

import { FilePointer } from '.'

export class StorageReadError extends Data.TaggedError('StorageReadError')<{
  readonly cause: unknown
  readonly path: string
  readonly bucket: string
}> {}

export class StorageReader extends Context.Tag('StorageReader')<
  StorageReader,
  {
    readonly read: (
      pointer: FilePointer
    ) => Effect.Effect<Uint8Array, StorageReadError>
  }
>() {}

const reader = Effect.serviceFunctions(StorageReader)

export const readFile = flow(reader.read, Effect.withSpan('readFile'))
