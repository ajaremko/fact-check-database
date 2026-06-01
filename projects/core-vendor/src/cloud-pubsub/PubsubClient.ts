import { Context, Effect, Config, flow, Layer } from 'effect'
import { PubSub, ClientConfig } from '@google-cloud/pubsub'

/**
 * Provides a shared Google Cloud `PubSub` client instance.
 *
 * This is the base layer required by both `PubsubTopic` and `PubsubSubscription`.
 * Credentials default to Application Default Credentials (ADC), which are
 * resolved automatically in Cloud Run via the attached service account.
 */
export class PubsubClient extends Context.Tag('PubsubClient')<
  PubsubClient,
  {
    readonly client: PubSub
  }
>() {}

type PubsubOptionsConfig = {
  [k in keyof ClientConfig]?: Config.Config<NonNullable<ClientConfig[k]>>
}

function make(config?: PubsubOptionsConfig) {
  return Effect.gen(function* () {
    yield* Effect.logTrace('Creating pubsub client')
    if (config) {
      const options = yield* Config.all(config)
      const client = new PubSub(options)
      return { client }
    }
    const client = new PubSub()
    return { client }
  })
}

/**
 * Creates an Effect layer providing a `PubsubClient`.
 *
 * `config` is optional. When omitted, the client uses Application Default
 * Credentials with no additional options. When provided, each key is a
 * `Config.Config<T>` resolved at Effect runtime (e.g. from environment variables).
 *
 * @example
 * // Using ADC (typical in Cloud Run)
 * Effect.provide(PubsubClient.layer())
 *
 * // With explicit project
 * Effect.provide(PubsubClient.layer({ projectId: Config.string('PUBSUB_PROJECT_ID') }))
 */
export const layer = flow(make, Layer.effect(PubsubClient))
