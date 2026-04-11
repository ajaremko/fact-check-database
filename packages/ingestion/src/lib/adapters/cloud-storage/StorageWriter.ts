import { Config, ConfigError, Effect, Layer } from 'effect'

import { StorageBucket, StorageClient } from '@news-research/cloud-storage'

import { StorageWriteError, StorageWriter } from '../../ports'

export const make = Effect.gen(function* () {
  const { bucket } = yield* StorageBucket.StorageBucket
  return StorageWriter.of({
    write: (opts) =>
      StorageBucket.writeFile(opts.path, opts.data, {
        resumable: false,
        contentType: opts.contentType ?? 'application/octet-stream',
        metadata: opts.meta,
      }).pipe(
        Effect.map(() => ({
          bucket: bucket.name,
          object: opts.path,
        })),
        Effect.mapError((cause) => new StorageWriteError({ cause })),
        Effect.provideService(StorageBucket.StorageBucket, { bucket })
      ),
  })
})

export const layer: Layer.Layer<
  StorageWriter,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(StorageWriter, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('STORAGE_BUCKET_NAME')))
)
