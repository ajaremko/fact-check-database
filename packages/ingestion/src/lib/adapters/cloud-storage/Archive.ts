import { Config, ConfigError, Effect, Layer } from 'effect'

import { StorageBucket, StorageClient } from '@news-research/cloud-storage'

import { Archive, ArchiveError } from '../../ports'

export const make = Effect.gen(function* () {
  const { bucket } = yield* StorageBucket.StorageBucket
  return Archive.of({
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
        Effect.mapError((cause) => new ArchiveError({ cause })),
        Effect.provideService(StorageBucket.StorageBucket, { bucket })
      ),
    read: (pointer) =>
      StorageBucket.downloadFile(pointer.object).pipe(
        Effect.map(([data]) => new Uint8Array(data)),
        Effect.mapError((cause) => new ArchiveError({ cause })),
        Effect.provideService(StorageBucket.StorageBucket, { bucket })
      ),
  })
})

export const layer: Layer.Layer<
  Archive,
  ConfigError.ConfigError,
  StorageClient.StorageClient
> = Layer.effect(Archive, make).pipe(
  Layer.provide(StorageBucket.layer(Config.string('ARCHIVE_BUCKET_NAME')))
)
