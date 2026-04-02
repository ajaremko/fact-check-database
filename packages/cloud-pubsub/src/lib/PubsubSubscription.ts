import { Config, Context, Data, Effect, flow, Layer } from 'effect'
import { Subscription, SubscriberOptions } from '@google-cloud/pubsub'

import { PubsubClient } from './PubsubClient'

/**
 * Provides a Google Cloud Pub/Sub `Subscription` for receiving messages.
 *
 * This layer is **scoped**: the subscription is automatically closed via
 * `subscription.close()` when the enclosing Effect scope is released. Use
 * `Layer.scoped` or `Effect.scoped` to control the lifetime.
 */
export class PubsubSubscription extends Context.Tag('PubsubSubscription')<
  PubsubSubscription,
  {
    readonly subscription: Subscription
  }
>() {}

type SubscriptionOptionsConfig = {
  [k in keyof SubscriberOptions]?: Config.Config<
    NonNullable<SubscriberOptions[k]>
  >
}

function make(
  subscriptionName: Config.Config<string>,
  config?: SubscriptionOptionsConfig
) {
  const acquire = Effect.gen(function* () {
    const { client } = yield* PubsubClient
    const name = yield* subscriptionName
    if (config) {
      const options = yield* Config.all(config)
      const subscription = client.subscription(name, options)
      return { subscription }
    }
    const subscription = client.subscription(name)
    return { subscription }
  })

  function release(resource: Effect.Effect.Success<typeof acquire>) {
    return Effect.sync(() => {
      resource.subscription.close()
    })
  }

  return Effect.acquireRelease(acquire, release)
}

/**
 * Creates a scoped layer providing a `PubsubSubscription`.
 *
 * `subscriptionName` is required and must be a `Config.Config<string>`, typically
 * an environment variable. The subscription is closed automatically when the
 * layer scope is released.
 *
 * @example
 * Effect.provide(PubsubSubscription.layer(Config.string('PUBSUB_SUBSCRIPTION_NAME')))
 */
export const layer = flow(make, Layer.scoped(PubsubSubscription))

/**
 * Error type for subscription IO failures. Reserved for future use —
 * not currently thrown by the layer itself.
 */
export class PubsubSubscriptionIOError extends Data.TaggedError(
  'PubsubSubscriptionIOError'
)<{
  readonly cause: unknown
}> {}
