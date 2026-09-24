import { Config, ConfigError, Effect, Layer } from 'effect'

import * as StorageBucket from '@fact-check-database/core-vendor/cloud-storage/StorageBucket'
import * as StorageClient from '@fact-check-database/core-vendor/cloud-storage/StorageClient'

import { StorageWriteError, StorageWriter } from '../ports/StorageWriter'

const adapter = 'CloudStorageStorageWriter'

/**
 * Builds a {@link StorageWriter} that writes to the current GCS bucket.
 * Unlike the reader, the bucket is bound once at construction time (see
 * {@link layer}), since a writer only ever targets its own output bucket.
 */
export const make = Effect.gen(function* () {
  const { bucket } = yield* StorageBucket.StorageBucket
  yield* Effect.annotateLogsScoped({ adapter, 'bucket.name': bucket.name })
  yield* Effect.logTrace('Storage writer created')

  return StorageWriter.of({
    write: (opts) =>
      Effect.gen(function* () {
        const contentType = opts.contentType ?? 'application/octet-stream'
        yield* Effect.annotateLogsScoped({
          adapter,
          'bucket.name': bucket.name,
          'opts.path': opts.path,
          contentType,
        })

        yield* StorageBucket.writeFile(opts.path, opts.data, {
          resumable: false,
          contentType,
          metadata: opts.meta,
        }).pipe(
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
        )

        yield* Effect.logTrace('Object written')

        return {
          bucket: bucket.name,
          object: opts.path,
        }
      }).pipe(Effect.scoped),
  })
}).pipe(Effect.scoped)

/** Layer providing {@link StorageWriter} backed by the `STORAGE_BUCKET_NAME` GCS bucket. Production adapter. */
export const layer: Layer.Layer<
  StorageWriter,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(StorageWriter, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('STORAGE_BUCKET_NAME')))
)
