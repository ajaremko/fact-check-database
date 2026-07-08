import { Effect, Layer } from 'effect'

import { StorageWriter } from '../ports/StorageWriter'

/**
 * Layer providing {@link StorageWriter} backed by `storage`, a plain
 * object used as a fake key/value store. Test double — pass the same
 * object reference to a matching {@link InMemoryStorageReader} layer so
 * specs can assert on what was written.
 */
export function layer(storage: Record<string, string>) {
  return Layer.succeed(StorageWriter, {
    write: (opts) =>
      Effect.sync(() => {
        storage[opts.path] = opts.data.toString()
        return {
          object: opts.path,
          bucket: 'inmemory',
        }
      }),
  })
}
