import { Effect, Layer } from 'effect'
import { FileSystem } from '@effect/platform'

import { StorageReadError, StorageReader } from '../ports/StorageReader'

const adapter = 'FileSystemStorageReader'

/**
 * Builds a {@link StorageReader} that reads a file directly from the local
 * filesystem, using the pointer's `object` field as the file path.
 */
export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  yield* Effect.annotateLogsScoped({ adapter })
  yield* Effect.logTrace('Storage reader created')

  return StorageReader.of({
    read: (pointer) =>
      Effect.gen(function* () {
        yield* Effect.annotateLogsScoped({
          adapter,
          'pointer.bucket': pointer.bucket,
          'pointer.object': pointer.object,
        })

        const data = yield* fs.readFile(pointer.object).pipe(
          Effect.mapError(
            (cause) =>
              new StorageReadError({
                cause,
                message: 'Failed to read file from filesystem',
                path: pointer.object,
                bucket: pointer.bucket,
              })
          )
        )

        yield* Effect.annotateLogsScoped({ 'data.length': data.length })
        yield* Effect.logTrace('Object read')

        return new Uint8Array(data)
      }).pipe(Effect.scoped),
  })
}).pipe(Effect.scoped)

/** Layer providing {@link StorageReader} backed by the local filesystem. Development adapter. */
export const layer = Layer.effect(StorageReader, make)
