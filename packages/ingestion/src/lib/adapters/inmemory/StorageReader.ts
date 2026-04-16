import { Effect, Layer } from 'effect'

import { StorageReader, StorageReadError } from '../../ports'

export function layer(storage: Record<string, string>) {
  return Layer.succeed(StorageReader, {
    read: (pointer) =>
      storage[pointer.object]
        ? Effect.succeed(Buffer.from(storage[pointer.object]))
        : Effect.fail(
            new StorageReadError({
              cause: new Error(`Object not found: ${pointer.object}`),
              path: pointer.object,
              bucket: pointer.bucket,
            })
          ),
  })
}
