import { Config, ConfigError, Effect, Layer, Queue } from 'effect'
import { Message as GcpsMessage } from '@google-cloud/pubsub'

import * as PubsubClient from '@fact-check-database/core-vendor/cloud-pubsub/PubsubClient'
import * as PubsubSubscription from '@fact-check-database/core-vendor/cloud-pubsub/PubsubSubscription'

import { MessageQueue, MessageQueueError } from '../ports/MessageQueue'

/**
 * Registers `message`/`error` listeners on the Pub/Sub subscription that
 * offer received messages onto the {@link MessageQueue}.
 *
 * Unlike the FileSystem/HttpServer feeders, this adapter doesn't route
 * through the internal/enqueueAndAwaitOutcome helper: the GCP Pub/Sub client
 * already exposes per-message ack()/nack() on the native SDK message, so
 * ack/nack here delegate straight to the SDK rather than bridging a queue
 * offer into an awaitable outcome via Effect.asyncEffect.
 */
const acquire = Effect.gen(function* () {
  const { subscription } = yield* PubsubSubscription.PubsubSubscription
  const { messages, errors } = yield* MessageQueue

  function messageListener(message: GcpsMessage) {
    Effect.runFork(
      messages.offer({
        ack: Effect.sync(() => message.ack()),
        nack: Effect.sync(() => message.nack()),
        message: {
          data: message.data,
          attributes: {},
          messageId: message.id,
          publishTime: message.publishTime,
        },
      })
    )
  }

  function errorListener(error: Error) {
    Effect.runFork(
      Queue.offer(
        errors,
        new MessageQueueError({
          cause: error,
          message: 'Pub/Sub subscription error',
        })
      )
    )
  }

  yield* Effect.sync(() => {
    subscription.on('message', messageListener)
    subscription.on('error', errorListener)
  })

  return { subscription, messageListener, errorListener }
})

/** Removes the listeners registered by {@link acquire} from the subscription. */
function release(resource: Effect.Effect.Success<typeof acquire>) {
  return Effect.sync(() => {
    resource.subscription.removeListener('message', resource.messageListener)
    resource.subscription.removeListener('error', resource.errorListener)
  })
}

/** Scoped effect that registers the feeder's listeners on acquire and removes them on release. */
export const make = Effect.acquireRelease(acquire, release)

const subscription = PubsubSubscription.layer(
  Config.string('PUBSUB_SUBSCRIPTION_NAME')
)

/**
 * Layer that continuously feeds an existing {@link MessageQueue} from the
 * `PUBSUB_SUBSCRIPTION_NAME` subscription via native SDK event listeners.
 * Production adapter. Provides no service of its own — it only has the
 * side effect of registering listeners for the lifetime of the layer.
 */
export const layer: Layer.Layer<
  never,
  ConfigError.ConfigError,
  PubsubClient.PubsubClient | MessageQueue
> = Layer.effectDiscard(Effect.scoped(make)).pipe(Layer.provide(subscription))
