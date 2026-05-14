import { Array, Config, Effect, Layer, Ref, Option } from 'effect'

import { PubsubSubscriberClient } from '@news-research/ingestion-vendor/cloud-pubsub'

import { MessageBatch, BatchMessage } from '../MessageBatch'

function acquire(subscriptionId: string, maxMessages: number) {
  return Effect.gen(function* () {
    const ackIds = yield* Ref.make<Set<string>>(new Set())
    const [response] = yield* PubsubSubscriberClient.pull(
      subscriptionId,
      maxMessages
    )
    const receivedMessages = response.receivedMessages ?? []
    const messages = Array.filterMap(
      receivedMessages,
      ({ message, ackId }): Option.Option<BatchMessage> => {
        if (!message || !ackId || !message.data) {
          return Option.none()
        }
        return Option.some({
          data: Buffer.from(message.data),
          ack: Ref.update(ackIds, (ids) => new Set(ids).add(ackId)),
        })
      }
    )
    return { messages, ackIds }
  })
}

type Resource = Effect.Effect.Success<ReturnType<typeof acquire>>

function release(subscriptionId: string) {
  return function (resource: Resource) {
    return Effect.gen(function* () {
      const ackIds = yield* Ref.get(resource.ackIds)
      if (ackIds.size === 0) {
        yield* Effect.logWarning(
          'Closing message batch with no messages to acknowledge'
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
