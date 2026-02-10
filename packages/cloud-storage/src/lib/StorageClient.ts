import { Context, Effect, Config, flow, Layer } from 'effect'
import { Storage, StorageOptions } from '@google-cloud/storage'

export class StorageClient extends Context.Tag('StorageClient')<
  StorageClient,
  {
    readonly client: Storage
  }
>() {}

type StorageOptionsConfig = {
  [k in keyof StorageOptions]?: Config.Config<NonNullable<StorageOptions[k]>>
}

function make(config?: StorageOptionsConfig) {
  return Effect.gen(function* () {
    if (config) {
      const options = yield* Config.all(config)
      const client = new Storage(options)
      return { client }
    }
    const client = new Storage()
    return { client }
  })
}

export const layer = flow(make, Layer.effect(StorageClient))
