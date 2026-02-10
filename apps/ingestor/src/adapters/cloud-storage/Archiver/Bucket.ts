import { Context, Data, Effect } from 'effect'
import { Bucket, SaveData, SaveOptions } from '@google-cloud/storage'
import { Response } from 'teeny-request'

export class StorageBucket extends Context.Tag('StorageBucket')<
  StorageBucket,
  {
    readonly bucket: Bucket
  }
>() {}

export class StorageBucketIOError extends Data.TaggedError(
  'StorageBucketIOError'
)<{
  readonly cause: unknown
}> {}

export function writeFile(name: string, data: SaveData, options?: SaveOptions) {
  return StorageBucket.pipe(
    Effect.andThen(({ bucket }) =>
      Effect.tryPromise({
        try: () => bucket.file(name).save(data, options),
        catch: (cause) => new StorageBucketIOError({ cause }),
      })
    )
  )
}

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
        catch: (cause) => new StorageBucketIOError({ cause }),
      })
    )
  )
}

export function provideBucket(bucket: Bucket) {
  return Effect.provideService(StorageBucket, { bucket })
}
