import { Config, ConfigError, Effect, Layer } from 'effect'

import { StorageBucket, StorageClient } from '@news-research/cloud-storage'

import { StorageReader, StorageReadError } from '../../ports'

export const make = Effect.gen(function* () {
  const { client } = yield* StorageClient.StorageClient
  const lookupBucket = yield* Effect.cachedFunction((name: string) =>
    StorageBucket.make(name)
  )
  return StorageReader.of({
    read: (pointer) =>
      StorageBucket.downloadFile(pointer.object).pipe(
        Effect.map(([data]) => new Uint8Array(data)),
        Effect.mapError((cause) => new StorageReadError({ cause })),
        Effect.provideServiceEffect(
          StorageBucket.StorageBucket,
          lookupBucket(pointer.bucket)
        ),
        Effect.provideService(StorageClient.StorageClient, { client })
      ),
  })
})

export const layer: Layer.Layer<
  StorageReader,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(StorageReader, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('StorageReader_BUCKET_NAME')))
)
