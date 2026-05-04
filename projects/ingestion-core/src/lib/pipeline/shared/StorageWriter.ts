import { Context, Data, Effect, flow } from 'effect'

import { FilePointer } from './FilePointer'

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

const writer = Effect.serviceFunctions(StorageWriter)

export const writeFile = flow(writer.write, Effect.withSpan('writeFile'))
