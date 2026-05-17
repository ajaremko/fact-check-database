import { Array, Config, Effect, Layer, Ref, Option } from 'effect'

import * as PubsubSubscriberClient from '@news-research/ingestion-vendor/cloud-pubsub/PubsubSubscriberClient'

import { MessageBatch, BatchMessage } from '../MessageBatch'

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
    const messages = yield* Effect.forEach(
      receivedMessages,
      ({ message, ackId }) =>
        Effect.gen(function* () {
          if (!message || !ackId || !message.data) {
            return Option.none()
          }
          const span = yield* Effect.makeSpan(`processMessage`)
          const annotations = {
            'message.id': message.messageId,
          }
          return Option.some<BatchMessage>({
            data: Buffer.from(message.data),
            ack: Ref.update(ackIds, (ids) => new Set(ids).add(ackId)),
            annotations,
            span,
          })
        })
    ).pipe(Effect.map(Array.getSomes))

    return { messages, ackIds }
  })
}

type Resource = Effect.Effect.Success<ReturnType<typeof acquire>>

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

const make = Effect.gen(function* () {
  const subscriptionId = yield* Config.string('PUBSUB_SUBSCRIPTION_ID')
  const maxMessages = yield* Config.number('MESSAGE_BATCH_SIZE')
  const { messages } = yield* Effect.acquireRelease(
    acquire(subscriptionId, maxMessages),
    release(subscriptionId)
  )
  return MessageBatch.of(messages)
})

export const layer = Layer.scoped(MessageBatch, make)
