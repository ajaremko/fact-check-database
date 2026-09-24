import { Config, ConfigError, Effect, Layer, Queue, Record } from 'effect'
import { Message as GcpsMessage } from '@google-cloud/pubsub'

import * as PubsubClient from '@fact-check-database/core-vendor/cloud-pubsub/PubsubClient'
import * as PubsubSubscription from '@fact-check-database/core-vendor/cloud-pubsub/PubsubSubscription'

import { MessageQueue, MessageQueueError } from '../ports/MessageQueue'

const adapter = 'CloudPubsubMessageQueueFeeder'

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
  yield* Effect.annotateLogsScoped({
    adapter,
    'subscription.name': subscription.name,
  })

  function messageListener(message: GcpsMessage) {
    Effect.runFork(
      Effect.gen(function* () {
        yield* Effect.annotateLogsScoped({
          adapter,
          'subscription.name': subscription.name,
          'message.id': message.id,
          'message.publishTime': message.publishTime.toISOString(),
        })
        const annotations = yield* Effect.logAnnotations.pipe(
          Effect.map(Record.fromEntries)
        )
        yield* messages.offer({
          ack: Effect.sync(() => message.ack()),
          nack: Effect.sync(() => message.nack()),
          message: {
            data: message.data,
            attributes: {},
            messageId: message.id,
            publishTime: message.publishTime,
          },
          annotations,
        })
        yield* Effect.logTrace('Message received')
      }).pipe(Effect.scoped)
    )
  }

  function errorListener(error: Error) {
    Effect.runFork(
      Effect.gen(function* () {
        yield* Effect.annotateLogsScoped({
          adapter,
          'subscription.name': subscription.name,
          'error.name': error.name,
        })
        yield* Effect.logDebug('Subscription error received')
        yield* Queue.offer(
          errors,
          new MessageQueueError({
            cause: error,
            message: 'Pub/Sub subscription error',
          })
        )
      }).pipe(Effect.scoped)
    )
  }

  yield* Effect.sync(() => {
    subscription.on('message', messageListener)
    subscription.on('error', errorListener)
  })
  yield* Effect.logTrace('Listeners registered')

  return { subscription, messageListener, errorListener }
}).pipe(Effect.scoped)

/** Removes the listeners registered by {@link acquire} from the subscription. */
function release(resource: Effect.Effect.Success<typeof acquire>) {
  return Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({
      adapter,
      'subscription.name': resource.subscription.name,
    })
    yield* Effect.sync(() => {
      resource.subscription.removeListener('message', resource.messageListener)
      resource.subscription.removeListener('error', resource.errorListener)
    })
    yield* Effect.logTrace('Listeners removed')
  }).pipe(Effect.scoped)
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
