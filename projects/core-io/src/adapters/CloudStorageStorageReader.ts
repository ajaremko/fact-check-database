import { ConfigError, Effect, Layer } from 'effect'

import * as StorageClient from '@news-research/core-vendor/cloud-storage/StorageClient'
import * as StorageBucket from '@news-research/core-vendor/cloud-storage/StorageBucket'

import { StorageReadError, StorageReader } from '../ports/StorageReader'

export const make = Effect.gen(function* () {
  const { client } = yield* StorageClient.StorageClient
  yield* Effect.logTrace('Creating gcs reader')
  return StorageReader.of({
    read: (pointer) =>
      StorageBucket.downloadFile(pointer.object).pipe(
        Effect.map(([data]) => new Uint8Array(data)),
        Effect.mapError(
          (cause) =>
            new StorageReadError({
              cause,
              message: 'Failed to read file from GCS',
              path: pointer.object,
              bucket: pointer.bucket,
            })
        ),
        Effect.provideService(StorageBucket.StorageBucket, {
          bucket: client.bucket(pointer.bucket),
        }),
        Effect.provideService(StorageClient.StorageClient, { client })
      ),
  })
})

export const layer: Layer.Layer<
  StorageReader,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(StorageReader, make)
