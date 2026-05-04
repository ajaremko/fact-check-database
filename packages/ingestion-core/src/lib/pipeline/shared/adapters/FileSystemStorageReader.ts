import { Effect, Layer } from 'effect'

import { FileSystem } from '@effect/platform'

import * as StorageReader from '../StorageReader'

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  return StorageReader.StorageReader.of({
    read: (pointer) =>
      Effect.gen(function* () {
        const data = yield* fs.readFile(pointer.object)
        return new Uint8Array(data)
      }).pipe(
        Effect.mapError(
          (cause) =>
            new StorageReader.StorageReadError({
              cause,
              path: pointer.object,
              bucket: pointer.bucket,
            })
        )
      ),
  })
})

export const layer = Layer.effect(StorageReader.StorageReader, make)
