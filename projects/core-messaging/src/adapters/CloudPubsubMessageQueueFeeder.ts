import { Config, ConfigError, Effect, Layer, Queue } from 'effect'
import { Message as GcpsMessage } from '@google-cloud/pubsub'

import * as PubsubClient from '@news-research/core-vendor/cloud-pubsub/PubsubClient'
import * as PubsubSubscription from '@news-research/core-vendor/cloud-pubsub/PubsubSubscription'

import { MessageQueue, MessageQueueError } from '../MessageQueue'

// Unlike the FileSystem/HttpServer feeders, this adapter doesn't route
// through the internal/enqueueAndAwaitOutcome helper: the GCP Pub/Sub client
// already exposes per-message ack()/nack() on the native SDK message, so
// ack/nack here delegate straight to the SDK rather than bridging a queue
// offer into an awaitable outcome via Effect.asyncEffect.
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

function release(resource: Effect.Effect.Success<typeof acquire>) {
  return Effect.sync(() => {
    resource.subscription.removeListener('message', resource.messageListener)
    resource.subscription.removeListener('error', resource.errorListener)
  })
}

export const make = Effect.acquireRelease(acquire, release)

const subscription = PubsubSubscription.layer(
  Config.string('PUBSUB_SUBSCRIPTION_NAME')
)

export const layer: Layer.Layer<
  never,
  ConfigError.ConfigError,
  PubsubClient.PubsubClient | MessageQueue
> = Layer.effectDiscard(Effect.scoped(make)).pipe(Layer.provide(subscription))
