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
  File,
  Bucket,
  BucketOptions,
  GetFilesOptions,
  MoveOptions,
  SaveData,
  SaveOptions,
  MoveResponse,
  GetFilesResponse,
} from '@google-cloud/storage'
import { NodeStream } from '@effect/platform-node'

import { logSdkFailure } from '../internal/logSdkFailure'

import { StorageClient } from './StorageClient'

const moduleName = 'StorageBucket'

export type {
  File,
  Bucket,
  BucketOptions,
  GetFilesOptions,
  MoveOptions,
  SaveData,
  SaveOptions,
  MoveResponse,
  GetFilesResponse,
} from '@google-cloud/storage'

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

/**
 * Builds a `StorageBucket` resource from a plain bucket name and resolved
 * `BucketOptions`, rather than `Config.Config` values. Requires
 * `StorageClient` in context.
 *
 * Unlike {@link layer}, which resolves `bucketName` and each option key from
 * `Config` at effect runtime, this takes already-resolved values — useful
 * when the bucket name is known outside of `Config` (e.g. computed at
 * call time rather than read from the environment).
 *
 * @example
 * const { bucket } = yield* make('my-bucket')
 */
export function make(bucketName: string, config?: BucketOptions) {
  return Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({
      module: moduleName,
      'bucket.name': bucketName,
    })
    const { client } = yield* StorageClient
    const bucket = config
      ? client.bucket(bucketName, config)
      : client.bucket(bucketName)
    yield* Effect.logTrace('Bucket opened')
    return { bucket }
  }).pipe(Effect.scoped)
}

function makeConfig(
  bucketName: Config.Config<string>,
  config?: StorageOptionsConfig
) {
  return Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({ module: moduleName })
    const { client } = yield* StorageClient
    const name = yield* bucketName
    yield* Effect.annotateLogsScoped({ 'bucket.name': name })
    const bucket = config
      ? client.bucket(name, yield* Config.all(config))
      : client.bucket(name)
    yield* Effect.logTrace('Bucket opened')
    return { bucket }
  }).pipe(Effect.scoped)
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
  return Effect.gen(function* () {
    const { bucket } = yield* StorageBucket
    yield* Effect.annotateLogsScoped({
      module: moduleName,
      'bucket.name': bucket.name,
      'file.name': name,
    })
    if (options?.contentType) {
      yield* Effect.annotateLogsScoped({ contentType: options.contentType })
    }
    yield* Effect.tryPromise({
      try: () => bucket.file(name).save(data, options),
      catch: (cause) =>
        new StorageBucketIOError({ cause, message: 'Failed to write file' }),
    }).pipe(logSdkFailure('File write failed'))
    yield* Effect.logTrace('File written')
  }).pipe(Effect.scoped)
}

/**
 * Moves (renames) the object at `name` to `destination` within the
 * `StorageBucket` in context.
 *
 * Any rejection from the underlying `file.move()` call is caught and wrapped
 * as a `StorageBucketIOError`.
 *
 * @example
 * yield* StorageBucket.moveFile('path/to/file.json', 'archive/file.json')
 */
export function moveFile(
  name: string,
  destination: string,
  options?: MoveOptions
): Effect.Effect<MoveResponse, StorageBucketIOError, StorageBucket> {
  return Effect.gen(function* () {
    const { bucket } = yield* StorageBucket
    yield* Effect.annotateLogsScoped({
      module: moduleName,
      'bucket.name': bucket.name,
      'file.name': name,
      destination,
    })
    const result = yield* Effect.tryPromise({
      try: () => bucket.file(name).move(destination, options),
      catch: (cause) =>
        new StorageBucketIOError({ cause, message: 'Failed to move file' }),
    }).pipe(logSdkFailure('File move failed'))
    yield* Effect.logTrace('File moved')
    return result
  }).pipe(Effect.scoped)
}

/**
 * Downloads the contents of the object at `name` from the `StorageBucket` in context.
 *
 * Returns the single-element `[Buffer]` tuple that GCS's `file.download()`
 * resolves to (the whole object, not chunks); index or destructure it to get
 * the contents.
 *
 * Any rejection from the underlying `file.download()` call is caught and wrapped as a `StorageBucketIOError`.
 *
 * @example
 * const [data] = yield* StorageBucket.downloadFile('path/to/file.json')
 * const contents = data.toString('utf-8')
 */
export function downloadFile(
  name: string
): Effect.Effect<[Buffer], StorageBucketIOError, StorageBucket> {
  return Effect.gen(function* () {
    const { bucket } = yield* StorageBucket
    yield* Effect.annotateLogsScoped({
      module: moduleName,
      'bucket.name': bucket.name,
      'file.name': name,
    })
    const result = yield* Effect.tryPromise({
      try: () => bucket.file(name).download(),
      catch: (cause) =>
        new StorageBucketIOError({
          cause,
          message: 'Failed to download file',
        }),
    }).pipe(logSdkFailure('File download failed'))
    yield* Effect.annotateLogsScoped({ 'data.length': result[0].length })
    yield* Effect.logTrace('File downloaded')
    return result
  }).pipe(Effect.scoped)
}

/**
 * Lists the files in the `StorageBucket` in context matching `options`.
 *
 * Returns the full listing at once. For a bucket too large to list in one
 * call, use {@link getFilesStream} instead. Any rejection from the
 * underlying `bucket.getFiles()` call is caught and wrapped as a
 * `StorageBucketIOError`.
 *
 * @example
 * const [files] = yield* StorageBucket.getFiles({ prefix: 'v1/type=fact_checks/' })
 */
export function getFiles(
  options?: GetFilesOptions
): Effect.Effect<GetFilesResponse, StorageBucketIOError, StorageBucket> {
  return Effect.gen(function* () {
    const { bucket } = yield* StorageBucket
    yield* Effect.annotateLogsScoped({
      module: moduleName,
      'bucket.name': bucket.name,
    })
    if (options?.prefix) {
      yield* Effect.annotateLogsScoped({ prefix: options.prefix })
    }
    const result = yield* Effect.tryPromise({
      try: () => bucket.getFiles(options),
      catch: (cause) =>
        new StorageBucketIOError({
          cause,
          message: 'Failed to list files',
        }),
    }).pipe(logSdkFailure('File listing failed'))
    yield* Effect.annotateLogsScoped({ 'files.length': result[0].length })
    yield* Effect.logTrace('Files listed')
    return result
  }).pipe(Effect.scoped)
}

/**
 * Streams the files in the `StorageBucket` in context matching `options`, one
 * `File` at a time, instead of buffering the full listing in memory.
 *
 * Returns an Effect `Stream` (the outer Effect only wires up the stream and
 * never fails); a rejection from the underlying readable is caught and
 * wrapped as a `StorageBucketIOError` in the stream's own error channel.
 *
 * @example
 * const files = yield* StorageBucket.getFilesStream({ prefix: 'v1/type=fact_checks/' })
 * yield* Stream.runForEach(files, (file) => Effect.logInfo(file.name))
 */
export function getFilesStream(
  options?: GetFilesOptions
): Effect.Effect<
  Stream.Stream<File, StorageBucketIOError, never>,
  never,
  StorageBucket
> {
  return Effect.gen(function* () {
    const { bucket } = yield* StorageBucket
    yield* Effect.annotateLogsScoped({
      module: moduleName,
      'bucket.name': bucket.name,
    })
    if (options?.prefix) {
      yield* Effect.annotateLogsScoped({ prefix: options.prefix })
    }
    const annotations = yield* Effect.logAnnotations
    const stream = NodeStream.fromReadable<StorageBucketIOError, File>(
      () => bucket.getFilesStream(options),
      (cause) =>
        new StorageBucketIOError({
          cause,
          message: 'Failed to get file stream',
        })
    ).pipe(
      // The stream runs later, outside this scope, so the annotations
      // captured here are re-applied to its failure log explicitly.
      Stream.tapError((error) =>
        Effect.fail(error).pipe(
          logSdkFailure('File stream failed'),
          Effect.ignore,
          Effect.annotateLogs(Object.fromEntries(annotations))
        )
      )
    )
    yield* Effect.logTrace('File stream opened')
    return stream
  }).pipe(Effect.scoped)
}
