import { Effect, Layer } from 'effect'

import { StorageReadError, StorageReader } from '../ports/StorageReader'

export function layer(storage: Record<string, string>) {
  return Layer.succeed(StorageReader, {
    read: (pointer) =>
      storage[pointer.object]
        ? Effect.succeed(Buffer.from(storage[pointer.object]))
        : Effect.fail(
            new StorageReadError({
              cause: new Error(`Object not found: ${pointer.object}`),
              message: 'Failed to read file from in-memory storage',
              path: pointer.object,
              bucket: pointer.bucket,
            })
          ),
  })
}
