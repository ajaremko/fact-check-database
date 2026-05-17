import { Config, ConfigError, Effect, Layer } from 'effect'

import * as StorageBucket from '@news-research/ingestion-vendor/cloud-storage/StorageBucket'
import * as StorageClient from '@news-research/ingestion-vendor/cloud-storage/StorageClient'

import { StorageWriteError, StorageWriter } from '../StorageWriter'

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

export const layer: Layer.Layer<
  StorageWriter,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(StorageWriter, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('STORAGE_BUCKET_NAME')))
)
