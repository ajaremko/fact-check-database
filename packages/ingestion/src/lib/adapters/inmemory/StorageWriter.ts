import { Effect, Layer } from 'effect'

import { StorageWriter } from '../../steps/shared'

export function layer(storage: Record<string, string>) {
  return Layer.succeed(StorageWriter.StorageWriter, {
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
