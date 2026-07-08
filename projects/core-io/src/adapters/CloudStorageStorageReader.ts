import { ConfigError, Effect, Layer } from 'effect'

import * as StorageClient from '@news-research/core-vendor/cloud-storage/StorageClient'
import * as StorageBucket from '@news-research/core-vendor/cloud-storage/StorageBucket'

import { StorageReadError, StorageReader } from '../ports/StorageReader'

/**
 * Builds a {@link StorageReader} that reads from GCS. Re-derives the target
 * bucket per call from the pointer being read (unlike the writer, which
 * binds to one fixed bucket at construction time), since a read may need to
 * target any bucket a pointer references.
 */
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

/** Layer providing {@link StorageReader} backed by GCS. Production adapter. */
export const layer: Layer.Layer<
  StorageReader,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(StorageReader, make)
