import { ConfigError, Effect, Layer } from 'effect'

import {
  StorageBucket,
  StorageClient,
} from '@news-research/ingestion/vendor/cloud-storage'

import { StorageReader } from '..'

export const make = Effect.gen(function* () {
  const { client } = yield* StorageClient.StorageClient
  return StorageReader.StorageReader.of({
    read: (pointer) =>
      StorageBucket.downloadFile(pointer.object).pipe(
        Effect.map(([data]) => new Uint8Array(data)),
        Effect.mapError(
          (cause) =>
            new StorageReader.StorageReadError({
              cause,
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
  StorageReader.StorageReader,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(StorageReader.StorageReader, make)
