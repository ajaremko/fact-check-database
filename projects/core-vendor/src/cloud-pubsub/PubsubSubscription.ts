import { Config, Context, Data, Effect, flow, Layer } from 'effect'
import { Subscription, SubscriberOptions } from '@google-cloud/pubsub'

import { logSdkFailure } from '../internal/logSdkFailure'

import { PubsubClient } from './PubsubClient'

const moduleName = 'PubsubSubscription'

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
    yield* Effect.annotateLogsScoped({ module: moduleName })
    const { client } = yield* PubsubClient
    const name = yield* subscriptionName
    yield* Effect.annotateLogsScoped({ 'subscription.name': name })
    const subscription = config
      ? client.subscription(name, yield* Config.all(config))
      : client.subscription(name)
    yield* Effect.logTrace('Subscription opened')
    return { subscription }
  }).pipe(Effect.scoped)

  function release({ subscription }: Effect.Effect.Success<typeof acquire>) {
    return Effect.gen(function* () {
      yield* Effect.annotateLogsScoped({
        module: moduleName,
        'subscription.name': subscription.name,
      })
      yield* Effect.tryPromise({
        try: () => subscription.close(),
        catch: (cause) =>
          new PubsubSubscriptionIOError({
            cause,
            message: 'Failed to close subscription',
          }),
      }).pipe(
        Effect.tap(() => Effect.logTrace('Subscription closed')),
        logSdkFailure('Subscription close failed'),
        Effect.ignore
      )
    }).pipe(Effect.scoped)
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
 * Raised when closing the subscription fails on release. It is logged at
 * debug and swallowed, since a finalizer cannot fail.
 */
export class PubsubSubscriptionIOError extends Data.TaggedError(
  'PubsubSubscriptionIOError'
)<{
  readonly cause: unknown
  readonly message: string
}> {}
