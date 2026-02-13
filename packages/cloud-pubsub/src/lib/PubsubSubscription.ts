import { Config, Context, Data, Effect, flow, Layer } from 'effect'
import { Subscription, SubscriberOptions } from '@google-cloud/pubsub'

import { PubsubClient } from './PubsubClient'

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
    return Effect.sync(() => resource.subscription.close())
  }

  return Effect.acquireRelease(acquire, release)
}

export const layer = flow(make, Layer.effect(PubsubSubscription))

export class PubsubSubscriptionIOError extends Data.TaggedError(
  'PubsubSubscriptionIOError'
)<{
  readonly cause: unknown
}> {}
