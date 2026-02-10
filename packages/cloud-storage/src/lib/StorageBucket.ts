import { Config, Context, Data, Effect, flow, Layer } from 'effect'
import {
  Bucket,
  BucketOptions,
  SaveData,
  SaveOptions,
} from '@google-cloud/storage'
import { Response } from 'teeny-request'

import { StorageClient } from './StorageClient'

export class StorageBucket extends Context.Tag('StorageBucket')<
  StorageBucket,
  {
    readonly bucket: Bucket
  }
>() {}

type StorageOptionsConfig = {
  [k in keyof BucketOptions]?: Config.Config<NonNullable<BucketOptions[k]>>
}

function make(
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

export const layer = flow(make, Layer.effect(StorageBucket))

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

export function downloadFile(name: string) {
  return StorageBucket.pipe(
    Effect.andThen(({ bucket }) =>
      Effect.tryPromise({
        try: () => bucket.file(name).download(),
        catch: (cause) => new StorageBucketIOError({ cause }),
      })
    )
  )
}
