import { Config, ConfigError, Effect, Layer } from 'effect'

import * as StorageBucket from '@news-research/core-vendor/cloud-storage/StorageBucket'
import * as StorageClient from '@news-research/core-vendor/cloud-storage/StorageClient'

import { StorageWriteError, StorageWriter } from '../ports/StorageWriter'

/**
 * Builds a {@link StorageWriter} that writes to the current GCS bucket.
 * Unlike the reader, the bucket is bound once at construction time (see
 * {@link layer}), since a writer only ever targets its own output bucket.
 */
export const make = Effect.gen(function* () {
  const { bucket } = yield* StorageBucket.StorageBucket
  yield* Effect.logTrace(`Creating gcs writer for bucket: ${bucket.name}`)
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
        Effect.mapError(
          (cause) =>
            new StorageWriteError({
              cause,
              message: 'Failed to write file to GCS',
              path: opts.path,
              bucket: bucket.name,
            })
        ),
        Effect.provideService(StorageBucket.StorageBucket, { bucket })
      ),
  })
})

/** Layer providing {@link StorageWriter} backed by the `STORAGE_BUCKET_NAME` GCS bucket. Production adapter. */
export const layer: Layer.Layer<
  StorageWriter,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(StorageWriter, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('STORAGE_BUCKET_NAME')))
)
