import { Context, Data, Effect, flow } from 'effect'

import { FilePointer } from './FilePointer'

/** Error raised when a {@link StorageReader} adapter fails to read the object at a given {@link FilePointer}. */
export class StorageReadError extends Data.TaggedError('StorageReadError')<{
  readonly cause: unknown
  readonly path: string
  readonly bucket: string
  readonly message: string
}> {}

/**
 * Port for reading a previously-archived object by its {@link FilePointer}.
 *
 * Use this for anything that needs to fetch a previously-written blob,
 * independent of the underlying store (GCS, filesystem, etc.). See
 * {@link StorageWriter} for the corresponding write capability.
 */
export class StorageReader extends Context.Tag('StorageReader')<
  StorageReader,
  {
    readonly read: (
      pointer: FilePointer
    ) => Effect.Effect<Uint8Array, StorageReadError>
  }
>() {}

const reader = Effect.serviceFunctions(StorageReader)

/** Reads the object at `pointer` via the current {@link StorageReader}, wrapped in a `readFile` tracing span. */
export const readFile = flow(reader.read, Effect.withSpan('readFile'))
