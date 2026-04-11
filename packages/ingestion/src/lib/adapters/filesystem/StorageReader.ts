import { Effect, Layer } from 'effect'

import { FileSystem } from '@effect/platform'

import { StorageReader, StorageReadError } from '../../ports'

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem
  return StorageReader.of({
    read: (pointer) =>
      Effect.gen(function* () {
        const data = yield* fs.readFile(pointer.object)
        return new Uint8Array(data)
      }).pipe(Effect.mapError((cause) => new StorageReadError({ cause }))),
  })
})

export const layer = Layer.effect(StorageReader, make)
