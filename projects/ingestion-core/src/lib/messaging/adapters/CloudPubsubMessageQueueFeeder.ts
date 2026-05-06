import { Config, ConfigError, Effect, Layer, Queue } from 'effect'
import { Message as GcpsMessage } from '@google-cloud/pubsub'

import { PubsubClient, PubsubSubscription } from '../../vendor/cloud-pubsub'

import * as MessageQueue from '../MessageQueue'

const acquire = Effect.gen(function* () {
  const { subscription } = yield* PubsubSubscription.PubsubSubscription
  const { messages, errors } = yield* MessageQueue.MessageQueue

  function messageListener(message: GcpsMessage) {
    Effect.runFork(
      messages.offer({
        ack: Effect.sync(() => message.ack()),
        nack: Effect.sync(() => message.nack()),
        data: message.data,
      })
    )
  }

  function errorListener(error: Error) {
    Effect.runFork(
      Queue.offer(
        errors,
        new MessageQueue.MessageQueueError({
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

const make = Effect.acquireRelease(acquire, release)

const subscription = PubsubSubscription.layer(
  Config.string('PUBSUB_SUBSCRIPTION_NAME')
)

export const layer: Layer.Layer<
  never,
  ConfigError.ConfigError,
  PubsubClient.PubsubClient | MessageQueue.MessageQueue
> = Layer.effectDiscard(Effect.scoped(make)).pipe(Layer.provide(subscription))
