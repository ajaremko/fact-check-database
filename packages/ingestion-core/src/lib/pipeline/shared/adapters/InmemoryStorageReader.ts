import { Effect, Layer } from 'effect'

import * as StorageReader from '../StorageReader'

export function layer(storage: Record<string, string>) {
  return Layer.succeed(StorageReader.StorageReader, {
    read: (pointer) =>
      storage[pointer.object]
        ? Effect.succeed(Buffer.from(storage[pointer.object]))
        : Effect.fail(
            new StorageReader.StorageReadError({
              cause: new Error(`Object not found: ${pointer.object}`),
              path: pointer.object,
              bucket: pointer.bucket,
            })
          ),
  })
}
