import {
  Config,
  ConfigError,
  Context,
  Data,
  Effect,
  flow,
  Layer,
  Stream,
} from 'effect'
import {
  Bucket,
  BucketOptions,
  GetFilesOptions,
  MoveOptions,
  SaveData,
  SaveOptions,
} from '@google-cloud/storage'
import { Response } from 'teeny-request'
import { NodeStream } from '@effect/platform-node'

import { StorageClient } from './StorageClient'

/**
 * Provides a Google Cloud Storage `Bucket` for reading and writing objects.
 */
export class StorageBucket extends Context.Tag('StorageBucket')<
  StorageBucket,
  {
    readonly bucket: Bucket
  }
>() {}

type StorageOptionsConfig = {
  [k in keyof BucketOptions]?: Config.Config<NonNullable<BucketOptions[k]>>
}

export function make(bucketName: string, config?: BucketOptions) {
  return Effect.gen(function* () {
    const { client } = yield* StorageClient
    if (config) {
      const bucket = client.bucket(bucketName, config)
      return { bucket }
    }
    const bucket = client.bucket(bucketName)
    return { bucket }
  })
}

function makeConfig(
  bucketName: Config.Config<string>,
  config?: StorageOptionsConfig
) {
  return Effect.gen(function* () {
    const { client } = yield* StorageClient
    const name = yield* bucketName
    if (config) {
      const options = yield* Config.all(config)
      const bucket = client.bucket(name, options)
      return { bucket }
    }
    const bucket = client.bucket(name)
    return { bucket }
  })
}

/**
 * Creates an Effect layer providing a `StorageBucket`.
 *
 * `bucketName` is required and must be a `Config.Config<string>`, typically
 * an environment variable. Requires `StorageClient` to be provided in the
 * layer stack.
 *
 * @example
 * Effect.provide(StorageBucket.layer(Config.string('STORAGE_BUCKET_NAME')))
 */
export const layer: (
  bucketName: Config.Config<string>,
  config?: StorageOptionsConfig | undefined
) => Layer.Layer<StorageBucket, ConfigError.ConfigError, StorageClient> = flow(
  makeConfig,
  Layer.effect(StorageBucket)
)

/**
 * Thrown when a GCS object I/O operation rejects.
 *
 * @example
 * yield* StorageBucket.writeFile('output.json', data).pipe(
 *   Effect.catchTag('StorageBucketIOError', (err) => Effect.logError('Write failed', err.cause))
 * )
 */
export class StorageBucketIOError extends Data.TaggedError(
  'StorageBucketIOError'
)<{
  readonly cause: unknown
  readonly message: string
}> {}

/**
 * Writes `data` to the object at `name` to the `StorageBucket` in context.
 *
 * Any rejection from the underlying `file.save()` call is caught and wrapped
 * as a `StorageBucketIOError`.
 *
 * @example
 * yield* StorageBucket.writeFile('path/to/file.json', Buffer.from(JSON.stringify(payload)))
 */
export function writeFile(
  name: string,
  data: SaveData,
  options?: SaveOptions
): Effect.Effect<void, StorageBucketIOError, StorageBucket> {
  return StorageBucket.pipe(
    Effect.andThen(({ bucket }) =>
      Effect.tryPromise({
        try: () => bucket.file(name).save(data, options),
        catch: (cause) =>
          new StorageBucketIOError({ cause, message: 'Failed to write file' }),
      })
    )
  )
}

export function moveFile(
  name: string,
  destination: string,
  options?: MoveOptions
): Effect.Effect<void, StorageBucketIOError, StorageBucket> {
  return StorageBucket.pipe(
    Effect.andThen(({ bucket }) =>
      Effect.tryPromise({
        try: () => bucket.file(name).move(destination, options),
        catch: (cause) =>
          new StorageBucketIOError({ cause, message: 'Failed to move file' }),
      })
    )
  )
}

/**
 * Reads metadata for the object at `name` from the `StorageBucket` in context.
 *
 * Returns a tuple of `[metadata, response]`. The metadata object contains
 * GCS object attributes such as `contentType`, `size`, and `updated`.
 *
 * Any rejection from the underlying `file.getMetadata()` call is caught and wrapped as a `StorageBucketIOError`.
 *
 * @example
 * const [metadata] = yield* StorageBucket.readFileMetadata('path/to/file.json')
 */
export function readFileMetadata(
  name: string
): Effect.Effect<
  [Record<string, unknown>, Response<unknown>],
  StorageBucketIOError,
  StorageBucket
> {
  return StorageBucket.pipe(
    Effect.andThen(({ bucket }) =>
      Effect.tryPromise({
        try: () => bucket.file(name).getMetadata(),
        catch: (cause) =>
          new StorageBucketIOError({
            cause,
            message: 'Failed to read file metadata',
          }),
      })
    )
  )
}

/**
 * Downloads the contents of the object at `name` from the `StorageBucket` in context.
 *
 * Returns a `Buffer[]`; concatenate the chunks to reconstruct the full payload.
 *
 * Any rejection from the underlying `file.download()` call is caught and wrapped as a `StorageBucketIOError`.
 *
 * @example
 * const chunks = yield* StorageBucket.downloadFile('path/to/file.json')
 * const contents = Buffer.concat(chunks).toString('utf-8')
 */
export function downloadFile(
  name: string
): Effect.Effect<[Buffer], StorageBucketIOError, StorageBucket> {
  return StorageBucket.pipe(
    Effect.andThen(({ bucket }) =>
      Effect.tryPromise({
        try: () => bucket.file(name).download(),
        catch: (cause) =>
          new StorageBucketIOError({
            cause,
            message: 'Failed to download file',
          }),
      })
    )
  )
}

export function getFilesStream(options?: GetFilesOptions) {
  return StorageBucket.pipe(
    Effect.map(({ bucket }) =>
      NodeStream.fromReadable(
        () => bucket.getFilesStream(options),
        (cause) =>
          new StorageBucketIOError({
            cause,
            message: 'Failed to get file stream',
          })
      )
    )
  )
}
