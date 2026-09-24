import { ConfigError, Effect, Layer } from 'effect'

import * as StorageClient from '@fact-check-database/core-vendor/cloud-storage/StorageClient'
import * as StorageBucket from '@fact-check-database/core-vendor/cloud-storage/StorageBucket'

import { StorageReadError, StorageReader } from '../ports/StorageReader'

const adapter = 'CloudStorageStorageReader'

/**
 * Builds a {@link StorageReader} that reads from GCS. Re-derives the target
 * bucket per call from the pointer being read (unlike the writer, which
 * binds to one fixed bucket at construction time), since a read may need to
 * target any bucket a pointer references.
 */
export const make = Effect.gen(function* () {
  const { client } = yield* StorageClient.StorageClient
  yield* Effect.annotateLogsScoped({ adapter })
  yield* Effect.logTrace('Storage reader created')

  return StorageReader.of({
    read: (pointer) =>
      Effect.gen(function* () {
        yield* Effect.annotateLogsScoped({
          adapter,
          'pointer.bucket': pointer.bucket,
          'pointer.object': pointer.object,
        })

        const [data] = yield* StorageBucket.downloadFile(pointer.object).pipe(
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
        )

        yield* Effect.annotateLogsScoped({ 'data.length': data.length })
        yield* Effect.logTrace('Object read')

        return new Uint8Array(data)
      }).pipe(Effect.scoped),
  })
}).pipe(Effect.scoped)

/** Layer providing {@link StorageReader} backed by GCS. Production adapter. */
export const layer: Layer.Layer<
  StorageReader,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(StorageReader, make)
