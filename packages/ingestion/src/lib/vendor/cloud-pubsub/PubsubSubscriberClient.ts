import { Context, Effect, Config, flow, Layer, Data } from 'effect'
import { ClientConfig, v1 } from '@google-cloud/pubsub'
import type { google } from '@google-cloud/pubsub/build/protos/protos'

/**
 * Provides a shared Google Cloud `PubSub` client instance.
 *
 * This is the base layer required by both `PubsubTopic` and `PubsubSubscription`.
 * Credentials default to Application Default Credentials (ADC), which are
 * resolved automatically in Cloud Run via the attached service account.
 */
export class PubsubSubscriberClient extends Context.Tag(
  'PubsubSubscriberClient'
)<
  PubsubSubscriberClient,
  {
    readonly client: v1.SubscriberClient
  }
>() {}

type PubsubOptionsConfig = {
  [k in keyof ClientConfig]?: Config.Config<NonNullable<ClientConfig[k]>>
}

function make(config?: PubsubOptionsConfig) {
  return Effect.gen(function* () {
    if (config) {
      const options = yield* Config.all(config)
      const client = new v1.SubscriberClient(options)
      return { client }
    }
    const client = new v1.SubscriberClient()
    return { client }
  })
}

/**
 * Creates an Effect layer providing a `PubsubSubscriberClient`.
 *
 * `config` is optional. When omitted, the client uses Application Default
 * Credentials with no additional options. When provided, each key is a
 * `Config.Config<T>` resolved at Effect runtime (e.g. from environment variables).
 *
 * @example
 * // Using ADC (typical in Cloud Run)
 * Effect.provide(PubsubSubscriberClient.layer())
 *
 * // With explicit project
 * Effect.provide(PubsubSubscriberClient.layer({ projectId: Config.string('PUBSUB_PROJECT_ID') }))
 */
export const layer = flow(make, Layer.effect(PubsubSubscriberClient))

/**
 * Thrown when a `subscriptionClient.pull()` call rejects.
 *
 * @example
 * yield* PubsubSubscriberClient.pull('my-project', 'my-subscription', 100).pipe(
 *   Effect.catchTag('PubsubSubscriberClientIOError', (err) => Effect.logError('Pull failed', err.cause))
 * )
 */
export class PubsubSubscriberClientIOError extends Data.TaggedError(
  'PubsubSubscriberClientIOError'
)<{
  readonly cause: unknown
}> {}

export type AckId = google.pubsub.v1.IReceivedMessage['ackId']

export function pull(subscriptionId: string, maxMessages = 10) {
  return Effect.gen(function* () {
    const { client } = yield* PubsubSubscriberClient
    const result = yield* Effect.tryPromise({
      try: () =>
        client.pull({
          subscription: subscriptionId,
          maxMessages,
        }),
      catch: (cause) => new PubsubSubscriberClientIOError({ cause }),
    })
    return result
  })
}

export function acknowledge(subscriptionId: string, ackIds: string[]) {
  return Effect.gen(function* () {
    const { client } = yield* PubsubSubscriberClient
    yield* Effect.tryPromise({
      try: () =>
        client.acknowledge({
          subscription: subscriptionId,
          ackIds,
        }),
      catch: (cause) => new PubsubSubscriberClientIOError({ cause }),
    })
  })
}
