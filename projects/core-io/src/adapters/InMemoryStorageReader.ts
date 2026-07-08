import { Effect, Layer } from 'effect'

import { StorageReadError, StorageReader } from '../ports/StorageReader'

/**
 * Layer providing {@link StorageReader} backed by `storage`, a plain
 * object used as a fake key/value store. Test double — pass the same
 * object reference to a matching {@link InMemoryStorageWriter} layer (or
 * pre-populate it directly) so specs can assert on what was read/written.
 * Fails with {@link StorageReadError} if `pointer.object` isn't a key in
 * `storage`.
 */
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
