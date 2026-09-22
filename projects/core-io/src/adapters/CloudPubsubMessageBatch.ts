import { Array, Config, Effect, Layer, Ref, Option } from 'effect'

import * as PubsubSubscriberClient from '@fact-check-database/core-vendor/cloud-pubsub/PubsubSubscriberClient'

import { MessageBatch, BatchMessage } from '../ports/MessageBatch'

/**
 * Pulls up to `maxMessages` from the given Pub/Sub subscription, filtering
 * out any malformed messages. Each returned {@link BatchMessage}'s `ack`
 * only records its ackId locally (via the returned `ackIds` ref) — the
 * actual Pub/Sub acknowledge RPC is deferred to {@link release}, batching
 * all acks into a single call at scope close.
 */
function acquire(subscriptionId: string, maxMessages: number) {
  return Effect.gen(function* () {
    yield* Effect.logTrace(
      `Acquiring message batch of size ${maxMessages} from pubsub subscription: ${subscriptionId}`
    )
    const ackIds = yield* Ref.make<Set<string>>(new Set())
    const [response] = yield* PubsubSubscriberClient.pull(
      subscriptionId,
      maxMessages
    )
    const receivedMessages = response.receivedMessages ?? []
    yield* Effect.logTrace(
      `Received ${receivedMessages.length} messages from pubsub subscription: ${subscriptionId}`
    )
    const messages = yield* Effect.forEach(
      receivedMessages,
      ({ message, ackId }) =>
        Effect.gen(function* () {
          if (
            !message ||
            !ackId ||
            !message.data ||
            !message.messageId ||
            !message.publishTime
          ) {
            yield* Effect.logWarning(
              'Received malformed message from pubsub subscription'
            )
            return Option.none()
          }
          const span = yield* Effect.makeSpan(`processMessage`)
          const annotations = {
            'message.id': message.messageId,
          }
          return Option.some<BatchMessage>({
            message: {
              data: Buffer.from(message.data),
              attributes: message.attributes ?? {},
              messageId: message.messageId,
              publishTime: new Date(Number(message.publishTime.nanos) / 1e6),
            },
            ack: Ref.update(ackIds, (ids) => new Set(ids).add(ackId)),
            annotations,
            span,
          })
        })
    ).pipe(Effect.map(Array.getSomes))

    yield* Effect.logTrace(
      `Parsed ${messages.length} processable messages from pubsub subscription: ${subscriptionId}`
    )

    return { messages, ackIds }
  })
}

type Resource = Effect.Effect.Success<ReturnType<typeof acquire>>

/**
 * Acknowledges every message pulled by {@link acquire} in a single Pub/Sub
 * RPC when the batch's scope closes. Logs and no-ops if nothing was acked
 * (e.g. an empty pull).
 */
function release(subscriptionId: string) {
  return function (resource: Resource) {
    return Effect.gen(function* () {
      const ackIds = yield* Ref.get(resource.ackIds)
      yield* Effect.logTrace(
        `Releasing message batch and acknowledging ${ackIds.size} messages from pubsub subscription: ${subscriptionId}`
      )
      if (ackIds.size === 0) {
        yield* Effect.logWarning(
          'Releasing message batch with no messages to acknowledge'
        )
        return
      }

      yield* Effect.orDie(
        PubsubSubscriberClient.acknowledge(
          subscriptionId,
          Array.fromIterable(ackIds)
        )
      )
    })
  }
}

/**
 * Builds a {@link MessageBatch} by pulling `MESSAGE_BATCH_SIZE` messages
 * from the `PUBSUB_SUBSCRIPTION_ID` subscription. The pulled messages are
 * batch-acknowledged in one RPC when the surrounding scope closes.
 */
export const make = Effect.gen(function* () {
  const subscriptionId = yield* Config.string('PUBSUB_SUBSCRIPTION_ID')
  const maxMessages = yield* Config.number('MESSAGE_BATCH_SIZE')
  const { messages } = yield* Effect.acquireRelease(
    acquire(subscriptionId, maxMessages),
    release(subscriptionId)
  )
  return MessageBatch.of(messages)
})

/** Layer providing {@link MessageBatch} via a scoped pull from GCP Pub/Sub. Production adapter. */
export const layer = Layer.scoped(MessageBatch, make)
