import { Config, ConfigError, Effect, Layer, pipe, Queue, Schema } from 'effect'
import { Message as GcpsMessage } from '@google-cloud/pubsub'

import { PubsubClient, PubsubSubscription } from '@news-research/cloud-pubsub'
import { IngestionAttempted } from '@news-research/ingestion/steps/ingest'
import { Node } from '@news-research/ingestion/util'

import { MessageQueue, MessageQueueError } from '../../MessageQueue'

const decodeIngestionAttempted = pipe(
  IngestionAttempted,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

const acquire = Effect.gen(function* () {
  const { subscription } = yield* PubsubSubscription.PubsubSubscription
  const { messages, errors } = yield* MessageQueue

  function messageListener(message: GcpsMessage) {
    Effect.runFork(
      messages.offer({
        ack: Effect.sync(() => message.ack()),
        nack: Effect.sync(() => message.nack()),
        read: decodeIngestionAttempted(message.data),
      })
    )
  }

  function errorListener(error: Error) {
    Effect.runFork(Queue.offer(errors, new MessageQueueError({ cause: error })))
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
  PubsubClient.PubsubClient | MessageQueue
> = Layer.effectDiscard(Effect.scoped(make)).pipe(Layer.provide(subscription))
