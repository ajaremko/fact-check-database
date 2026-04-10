import { Config, ConfigError, Effect, Layer, pipe, Queue, Schema } from 'effect'
import { Message as GcpsMessage } from '@google-cloud/pubsub'

import { PubsubClient, PubsubSubscription } from '@news-research/cloud-pubsub'
import { IngestionAttempted } from '@news-research/ingestion/ingest'
import { Node } from '@news-research/node'

import { MessageQueue, MessageQueueError, Message } from '../../MessageQueue'

// Record -> JSON -> Buffer
const decodeIngestionAttempted = pipe(
  IngestionAttempted,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

const acquire = Effect.gen(function* () {
  const { subscription } = yield* PubsubSubscription.PubsubSubscription
  const messages = yield* Queue.unbounded<Message>()
  const errors = yield* Queue.unbounded<MessageQueueError>()

  function messageListener(message: GcpsMessage) {
    Effect.runFork(
      Queue.offer(messages, {
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

  return { messages, errors, subscription, messageListener, errorListener }
})

function release(resource: Effect.Effect.Success<typeof acquire>) {
  return Effect.gen(function* () {
    yield* Effect.sync(() => {
      resource.subscription.removeListener('message', resource.messageListener)
      resource.subscription.removeListener('error', resource.errorListener)
    })
    yield* Queue.shutdown(resource.messages)
    yield* Queue.shutdown(resource.errors)
  })
}

const make = Effect.acquireRelease(acquire, release).pipe(
  Effect.map(({ messages, errors }) => MessageQueue.of({ messages, errors }))
)

const subscription = PubsubSubscription.layer(
  Config.string('PUBSUB_SUBSCRIPTION_NAME')
)

export const layer: Layer.Layer<
  MessageQueue,
  ConfigError.ConfigError,
  PubsubClient.PubsubClient
> = Layer.scoped(MessageQueue, make).pipe(Layer.provide(subscription))
