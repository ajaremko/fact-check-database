import { ConfigError, Effect, Layer } from 'effect'

import {
  StorageBucket,
  StorageClient,
  StorageBucketCache,
} from '@news-research/cloud-storage'

import { StorageReader, StorageReadError } from '../../ports'

export const make = Effect.gen(function* () {
  const { client } = yield* StorageClient.StorageClient
  const buckets = yield* StorageBucketCache.StorageBucketCache

  return StorageReader.of({
    read: (pointer) =>
      StorageBucket.downloadFile(pointer.object).pipe(
        Effect.map(([data]) => new Uint8Array(data)),
        Effect.mapError((cause) => new StorageReadError({ cause })),
        Effect.provideServiceEffect(
          StorageBucket.StorageBucket,
          buckets.get(pointer.bucket)
        ),
        Effect.provideService(StorageClient.StorageClient, { client })
      ),
  })
})

export const layer: Layer.Layer<
  StorageReader,
  ConfigError.ConfigError,
  StorageClient.StorageClient | StorageBucketCache.StorageBucketCache
> = Layer.effect(StorageReader, make)
