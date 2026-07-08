import { Context, Data, Effect, flow } from 'effect'

import { FilePointer } from './FilePointer'

/** Error raised when a {@link StorageWriter} adapter fails to write an object. */
export class StorageWriteError extends Data.TaggedError('StorageWriteError')<{
  readonly cause: unknown
  readonly path: string
  readonly bucket: string
  readonly message: string
}> {}

/**
 * Port for archiving or persisting a blob.
 *
 * Use this for anything that writes data that later needs to be retrieved
 * by a {@link FilePointer}, independent of the underlying store (GCS,
 * filesystem, etc.). See {@link StorageReader} for the corresponding read
 * capability.
 */
export class StorageWriter extends Context.Tag('StorageWriter')<
  StorageWriter,
  {
    readonly write: (options: {
      /** Destination path/key to write the object to. */
      path: string
      /** Raw bytes to write. */
      data: Uint8Array
      /** Optional metadata to store alongside the object. */
      meta?: Record<string, unknown>
      /** Optional MIME type to associate with the object. */
      contentType?: string
    }) => Effect.Effect<FilePointer, StorageWriteError>
  }
>() {}

const writer = Effect.serviceFunctions(StorageWriter)

/** Writes `data` via the current {@link StorageWriter}, wrapped in a `writeFile` tracing span. */
export const writeFile = flow(writer.write, Effect.withSpan('writeFile'))
