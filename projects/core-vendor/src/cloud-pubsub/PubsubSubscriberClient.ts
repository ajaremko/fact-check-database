import { Context, Effect, Config, flow, Layer, Data } from 'effect'
import { ClientConfig, v1 } from '@google-cloud/pubsub'
import type { google } from '@google-cloud/pubsub/build/protos/protos'

/**
 * Provides a shared Google Cloud Pub/Sub v1 `SubscriberClient` instance, for
 * pull-based access to a subscription (see `pull` and `acknowledge` below).
 *
 * This is a separate client from `PubsubClient`: `PubsubTopic` and
 * `PubsubSubscription` do not depend on it. Credentials default to
 * Application Default Credentials (ADC), which are resolved automatically in
 * Cloud Run via the attached service account.
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
    yield* Effect.logTrace('Creating v1 pubsub subscriber client')
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
 * Thrown when a `pull()` or `acknowledge()` call rejects.
 *
 * @example
 * yield* pull('projects/p/subscriptions/s', 100).pipe(
 *   Effect.catchTag('PubsubSubscriberClientIOError', (err) => Effect.logError('Pull failed', err.cause))
 * )
 */
export class PubsubSubscriberClientIOError extends Data.TaggedError(
  'PubsubSubscriberClientIOError'
)<{
  readonly cause: unknown
  readonly message: string
}> {}

/** The ack ID of a single pulled message, as returned by {@link pull}. */
export type AckId = google.pubsub.v1.IReceivedMessage['ackId']

/**
 * Pulls up to `maxMessages` messages from a subscription. Requires
 * `PubsubSubscriberClient` in context.
 *
 * This is a single synchronous pull, not a streaming pull: it returns
 * whatever is immediately available, which may be fewer than `maxMessages`
 * or none. Any rejection is caught and wrapped as a
 * {@link PubsubSubscriberClientIOError}.
 *
 * @example
 * const [{ receivedMessages }] = yield* pull('projects/p/subscriptions/s')
 */
export function pull(subscriptionId: string, maxMessages = 10) {
  return Effect.gen(function* () {
    const { client } = yield* PubsubSubscriberClient
    const result = yield* Effect.tryPromise({
      try: () =>
        client.pull({
          subscription: subscriptionId,
          maxMessages,
        }),
      catch: (cause) =>
        new PubsubSubscriberClientIOError({
          cause,
          message: 'Failed to pull messages from subscription',
        }),
    })
    return result
  })
}

/**
 * Acknowledges the given ack IDs on a subscription, so Pub/Sub does not
 * redeliver them. Requires `PubsubSubscriberClient` in context.
 *
 * Any rejection is caught and wrapped as a
 * {@link PubsubSubscriberClientIOError}.
 *
 * @example
 * const [{ receivedMessages }] = yield* pull(subscriptionId)
 * yield* acknowledge(
 *   subscriptionId,
 *   (receivedMessages ?? []).map((m) => m.ackId)
 * )
 */
export function acknowledge(subscriptionId: string, ackIds: string[]) {
  return Effect.gen(function* () {
    const { client } = yield* PubsubSubscriberClient
    yield* Effect.tryPromise({
      try: () =>
        client.acknowledge({
          subscription: subscriptionId,
          ackIds,
        }),
      catch: (cause) =>
        new PubsubSubscriberClientIOError({
          cause,
          message: 'Failed to acknowledge messages',
        }),
    })
  })
}
