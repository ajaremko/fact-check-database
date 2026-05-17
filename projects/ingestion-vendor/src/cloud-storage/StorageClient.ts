import { Context, Effect, Config, flow, Layer, ConfigError } from 'effect'
import { Storage, StorageOptions } from '@google-cloud/storage'

/**
 * Provides a shared Google Cloud `Storage` client instance.
 *
 * This is the base layer required by `StorageBucket`.
 * Credentials default to Application Default Credentials (ADC), which are
 * resolved automatically in Cloud Run via the attached service account.
 */
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
    yield* Effect.logTrace(`Creating Google Cloud Storage client`)
    if (config) {
      const options = yield* Config.all(config)
      const client = new Storage(options)
      return { client }
    }
    const client = new Storage()
    return { client }
  })
}

/**
 * Creates an Effect layer providing a `StorageClient`.
 *
 * `config` is optional. When omitted, the client uses Application Default
 * Credentials with no additional options. When provided, each key is a
 * `Config.Config<T>` resolved at Effect runtime (e.g. from environment variables).
 *
 * @example
 * // Using ADC (typical in Cloud Run)
 * Effect.provide(StorageClient.layer())
 *
 * // With explicit project
 * Effect.provide(StorageClient.layer({ projectId: Config.string('GCP_PROJECT_ID') }))
 */
export const layer: (
  config?: StorageOptionsConfig | undefined
) => Layer.Layer<StorageClient, ConfigError.ConfigError, never> = flow(
  make,
  Layer.effect(StorageClient)
)
