import { Array, Config, Effect, Exit, Layer, Ref, Option, Record } from 'effect'
import type { google } from '@google-cloud/pubsub/build/protos/protos'

import * as PubsubSubscriberClient from '@fact-check-database/core-vendor/cloud-pubsub/PubsubSubscriberClient'

import { MessageBatch, BatchMessage } from '../ports/MessageBatch'

import { timestampToDate } from '../internal/timestampToDate'

const adapter = 'CloudPubsubMessageBatch'

/**
 * Pulls from the subscription until `maxMessages` have been received or it
 * has nothing more to deliver.
 *
 * One pull is not enough: Pub/Sub returns whatever is immediately available,
 * which can be far fewer than requested even with thousands of messages
 * waiting. Each further pull asks only for what is still missing, and uses a
 * short deadline, because a pull on a drained subscription waits for its
 * deadline rather than returning empty. A pull that ends that way means
 * there are no more messages; it is not a failure.
 */
function pullUntilFull(
  subscriptionId: string,
  maxMessages: number,
  followUpTimeoutMillis: number
) {
  return Effect.gen(function* () {
    const receivedMessages: google.pubsub.v1.IReceivedMessage[] = []
    let pulls = 0

    while (receivedMessages.length < maxMessages) {
      const pulled = yield* PubsubSubscriberClient.pull(
        subscriptionId,
        maxMessages - receivedMessages.length,
        pulls === 0 ? undefined : { timeoutMillis: followUpTimeoutMillis }
      ).pipe(
        Effect.map(([response]) => response.receivedMessages ?? []),
        Effect.catchIf(PubsubSubscriberClient.isDeadlineExceeded, () =>
          Effect.succeed([])
        )
      )
      pulls += 1
      if (pulled.length === 0) {
        break
      }
      receivedMessages.push(...pulled)
    }

    return { receivedMessages, pulls }
  })
}

/**
 * Pulls up to `maxMessages` from the given Pub/Sub subscription, over as
 * many pulls as that takes, filtering out any malformed messages. Each
 * returned {@link BatchMessage}'s `ack` records its ack ID into a shared set
 * rather than acking immediately — the set is flushed as a single batch
 * acknowledge call by {@link release} when the batch's scope closes.
 */
function acquire(
  subscriptionId: string,
  maxMessages: number,
  followUpTimeoutMillis: number
) {
  return Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({ adapter, subscriptionId, maxMessages })

    const ackIds = yield* Ref.make<Set<string>>(new Set())
    const { receivedMessages, pulls } = yield* pullUntilFull(
      subscriptionId,
      maxMessages,
      followUpTimeoutMillis
    )

    yield* Effect.annotateLogsScoped({
      pulls,
      'receivedMessages.length': receivedMessages.length,
    })
    yield* Effect.logTrace('Messages pulled')

    function wrapMessage({
      message,
      ackId,
      deliveryAttempt,
    }: google.pubsub.v1.IReceivedMessage) {
      return Effect.gen(function* () {
        yield* Effect.annotateLogsScoped({
          ackId,
          'message.messageId': message?.messageId,
        })
        // Pub/Sub reports 0 when the subscription has no dead-letter policy
        if (deliveryAttempt) {
          yield* Effect.annotateLogsScoped({
            'message.deliveryAttempt': deliveryAttempt,
          })
        }

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
            ...(deliveryAttempt ? { deliveryAttempt } : {}),
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
 * Acknowledges every message acked during the batch's lifetime in a single
 * Pub/Sub RPC when the batch's scope closes successfully. Logs and no-ops if
 * nothing was acked (e.g. an empty pull), since Pub/Sub rejects an empty
 * acknowledge request.
 *
 * If the scope closes with a failure, nothing is acknowledged, even messages
 * that were acked: the work that depended on them (e.g. writing their
 * results) didn't complete, so Pub/Sub redelivers them once their ack
 * deadline passes.
 */
function release(subscriptionId: string) {
  return function (resource: Resource, exit: Exit.Exit<unknown, unknown>) {
    return Effect.gen(function* () {
      yield* Effect.annotateLogsScoped({ adapter, subscriptionId })

      const ackIds = yield* Ref.get(resource.ackIds)
      yield* Effect.annotateLogsScoped({ 'ackIds.size': ackIds.size })

      if (Exit.isFailure(exit)) {
        yield* Effect.logDebug('Batch released without acknowledging')
        return
      }

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
 * Builds a {@link MessageBatch} by pulling up to `MESSAGE_BATCH_SIZE`
 * messages from the `PUBSUB_SUBSCRIPTION_ID` subscription, over as many
 * pulls as that takes. `MESSAGE_BATCH_PULL_TIMEOUT_MS` (default 10 seconds)
 * bounds each pull after the first, which is how long the adapter waits to
 * learn that the subscription has nothing more. The pulled messages are
 * batch-acknowledged in one RPC when the surrounding scope closes
 * successfully.
 */
export const make = Effect.gen(function* () {
  const subscriptionId = yield* Config.string('PUBSUB_SUBSCRIPTION_ID')
  const maxMessages = yield* Config.number('MESSAGE_BATCH_SIZE')
  const followUpTimeoutMillis = yield* Config.number(
    'MESSAGE_BATCH_PULL_TIMEOUT_MS'
  ).pipe(Config.withDefault(10_000))

  const { messages } = yield* Effect.acquireRelease(
    acquire(subscriptionId, maxMessages, followUpTimeoutMillis),
    release(subscriptionId)
  )

  return MessageBatch.of(messages)
})

/** Layer providing {@link MessageBatch} via a scoped pull from GCP Pub/Sub. Production adapter. */
export const layer = Layer.scoped(MessageBatch, make)
