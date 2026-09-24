import { Array, Config, Effect, Layer, Ref, Option, Record } from 'effect'
import type { google } from '@google-cloud/pubsub/build/protos/protos'

import * as PubsubSubscriberClient from '@fact-check-database/core-vendor/cloud-pubsub/PubsubSubscriberClient'

import { MessageBatch, BatchMessage } from '../ports/MessageBatch'

import { timestampToDate } from '../internal/timestampToDate'

const adapter = 'CloudPubsubMessageBatch'

/**
 * Pulls up to `maxMessages` from the given Pub/Sub subscription, filtering
 * out any malformed messages. Each returned {@link BatchMessage}'s `ack`
 * records its ack ID into a shared set rather than acking immediately — the
 * set is flushed as a single batch acknowledge call by {@link release} when
 * the batch's scope closes.
 */
function acquire(subscriptionId: string, maxMessages: number) {
  return Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({ adapter, subscriptionId, maxMessages })

    const ackIds = yield* Ref.make<Set<string>>(new Set())
    const [response] = yield* PubsubSubscriberClient.pull(
      subscriptionId,
      maxMessages
    )
    const receivedMessages = response.receivedMessages ?? []

    yield* Effect.annotateLogsScoped({
      'receivedMessages.length': receivedMessages.length,
    })
    yield* Effect.logTrace('Messages pulled')

    function wrapMessage({
      message,
      ackId,
    }: google.pubsub.v1.IReceivedMessage) {
      return Effect.gen(function* () {
        yield* Effect.annotateLogsScoped({
          ackId,
          'message.messageId': message?.messageId,
        })

        if (
          !message ||
          !ackId ||
          !message.data ||
          !message.messageId ||
          !message.publishTime
        ) {
          yield* Effect.logDebug('Malformed message skipped')
          return Option.none<BatchMessage>()
        }

        const publishTime = timestampToDate(message.publishTime)
        yield* Effect.annotateLogsScoped({
          'message.publishTime': publishTime.toISOString(),
        })

        const span = yield* Effect.makeSpan('processMessage')
        const annotations = yield* Effect.logAnnotations.pipe(
          Effect.map(Record.fromEntries)
        )

        yield* Effect.logTrace('Message added to batch')

        return Option.some<BatchMessage>({
          message: {
            data: Buffer.from(message.data),
            attributes: message.attributes ?? {},
            messageId: message.messageId,
            publishTime,
          },
          ack: Ref.update(ackIds, (ids) => new Set(ids).add(ackId)),
          annotations,
          span,
        })
      }).pipe(Effect.scoped)
    }

    const wrapped = yield* Effect.forEach(receivedMessages, wrapMessage)
    const messages = Array.getSomes(wrapped)

    yield* Effect.annotateLogsScoped({ 'messages.length': messages.length })
    yield* Effect.logTrace('Message batch acquired')

    return { messages, ackIds }
  }).pipe(Effect.scoped)
}

type Resource = Effect.Effect.Success<ReturnType<typeof acquire>>

/**
 * Acknowledges every message pulled by {@link acquire} in a single Pub/Sub
 * RPC when the batch's scope closes. Logs and no-ops if nothing was acked
 * (e.g. an empty pull), since Pub/Sub rejects an empty acknowledge request.
 */
function release(subscriptionId: string) {
  return function (resource: Resource) {
    return Effect.gen(function* () {
      yield* Effect.annotateLogsScoped({ adapter, subscriptionId })

      const ackIds = yield* Ref.get(resource.ackIds)
      yield* Effect.annotateLogsScoped({ 'ackIds.size': ackIds.size })

      if (ackIds.size === 0) {
        yield* Effect.logTrace('No messages to acknowledge')
        return
      }

      yield* PubsubSubscriberClient.acknowledge(
        subscriptionId,
        Array.fromIterable(ackIds)
      ).pipe(
        Effect.tapErrorCause((cause) =>
          Effect.logFatal('Failed to acknowledge messages', cause)
        ),
        Effect.orDie
      )

      yield* Effect.logTrace('Messages acknowledged')
    }).pipe(Effect.scoped)
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
