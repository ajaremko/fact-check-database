import { Config, ConfigError, Effect, Layer, pipe, Queue, Schema } from 'effect'
import { Message as GcpsMessage } from '@google-cloud/pubsub'

import { PubsubClient, PubsubSubscription } from '@news-research/cloud-pubsub'
import { IngestionAttemptedSchema } from '@news-research/contracts'
import { Node } from '@news-research/node'

import {
  MessageQueue,
  Message,
  MessageQueueError,
} from '../../ports/MessageQueue'

// Record -> JSON -> Buffer
const decodeObservationFetched = pipe(
  IngestionAttemptedSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

const acquire = Effect.gen(function* () {
  console.log('Acquiring message queue')
  const { subscription } = yield* PubsubSubscription.PubsubSubscription
  const queue = yield* Queue.unbounded<Message>()

  function messageListener(message: GcpsMessage) {
    console.log('Received message:', message.id)
    Effect.runFork(
      Queue.offer(queue, {
        ack: Effect.sync(() => message.ack()),
        nack: Effect.sync(() => message.nack()),
        read: decodeObservationFetched(message.data).pipe(
          Effect.mapError((cause) => new MessageQueueError({ cause }))
        ),
      })
    )
  }

  function errorListener(error: Error) {
    console.log('Received error:', error.message)
    console.log('Received error:', error)
  }

  yield* Effect.sync(() => {
    subscription.on('message', messageListener)
    subscription.on('error', errorListener)
  })

  return { queue, subscription, messageListener, errorListener }
})

function release(resource: Effect.Effect.Success<typeof acquire>) {
  return Effect.gen(function* () {
    console.log('Releasing message queue')
    yield* Effect.sync(() => {
      resource.subscription.removeListener('message', resource.messageListener)
      resource.subscription.removeListener('error', resource.errorListener)
    })
    yield* Queue.shutdown(resource.queue)
  })
}

const subscription = PubsubSubscription.layer(
  Config.string('PUBSUB_SUBSCRIPTION_NAME')
)

const make = Effect.acquireRelease(acquire, release).pipe(
  Effect.map(({ queue }) => MessageQueue.of({ queue }))
)

export const layer: Layer.Layer<
  MessageQueue,
  ConfigError.ConfigError,
  PubsubClient.PubsubClient
> = Layer.scoped(MessageQueue, make).pipe(Layer.provide(subscription))
