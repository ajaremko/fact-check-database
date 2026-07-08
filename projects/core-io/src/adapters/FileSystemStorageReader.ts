import { Effect, Layer } from 'effect'
import { FileSystem } from '@effect/platform'

import { StorageReadError, StorageReader } from '../ports/StorageReader'

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  yield* Effect.logTrace(`Creating filesystem reader`)
  return StorageReader.of({
    read: (pointer) =>
      Effect.gen(function* () {
        const data = yield* fs.readFile(pointer.object)
        return new Uint8Array(data)
      }).pipe(
        Effect.mapError(
          (cause) =>
            new StorageReadError({
              cause,
              message: 'Failed to read file from filesystem',
              path: pointer.object,
              bucket: pointer.bucket,
            })
        )
      ),
  })
})

export const layer = Layer.effect(StorageReader, make)
