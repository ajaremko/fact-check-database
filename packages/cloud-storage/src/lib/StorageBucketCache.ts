import { Config, Context, Effect, flow, Layer } from 'effect'
import { Bucket, BucketOptions } from '@google-cloud/storage'

import { StorageClient } from './StorageClient'
import { make as makeStorageBucket } from './StorageBucket'

/**
 * Provides a Google Cloud Storage `Bucket` for reading and writing objects.
 */
export class StorageBucketCache extends Context.Tag('StorageBucketCache')<
  StorageBucketCache,
  {
    readonly get: (
      name: string
    ) => Effect.Effect<{ bucket: Bucket }, never, StorageClient>
  }
>() {}

type StorageOptionsConfig = {
  [k in keyof BucketOptions]?: Config.Config<NonNullable<BucketOptions[k]>>
}

export function make(config?: BucketOptions) {
  return Effect.gen(function* () {
    if (config) {
      const get = yield* Effect.cachedFunction((name: string) =>
        makeStorageBucket(name, config)
      )
      return { get }
    }
    const get = yield* Effect.cachedFunction((name: string) =>
      makeStorageBucket(name, config)
    )
    return { get }
  })
}

function makeConfig(config?: StorageOptionsConfig) {
  return Effect.gen(function* () {
    if (config) {
      const options = yield* Config.all(config)
      const get = yield* Effect.cachedFunction((name: string) =>
        makeStorageBucket(name, options)
      )
      return { get }
    }
    const get = yield* Effect.cachedFunction((name: string) =>
      makeStorageBucket(name, config)
    )
    return { get }
  })
}

/**
 * Creates an Effect layer providing a `StorageBucketCache`.
 *
 * Requires `StorageClient` to be provided in the layer stack.
 *
 * @example
 * Effect.provide(StorageBucketCache.layer())
 */
export const layer = flow(makeConfig, Layer.effect(StorageBucketCache))
