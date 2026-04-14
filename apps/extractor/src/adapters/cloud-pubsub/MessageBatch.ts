import { Array, Config, Effect, Layer, pipe, Ref, Schema, Option } from 'effect'

import { PubsubSubscriberClient } from '@news-research/cloud-pubsub'
import { SanitizationAttempted } from '@news-research/ingestion/sanitize'
import { Node } from '@news-research/ingestion/util'

import { MessageBatch, Message } from '../../MessageBatch'

const decodeSanitizationAttempted = pipe(
  SanitizationAttempted,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decodeUnknown
)

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
      ({ message, ackId }): Option.Option<Message> => {
        if (!message || !ackId) {
          return Option.none()
        }
        return Option.some({
          ack: Ref.update(ackIds, (ids) => new Set(ids).add(ackId)),
          read: decodeSanitizationAttempted(message.data),
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
      console.log(
        `Acknowledging ${ackIds.size} messages for subscription ${subscriptionId}`
      )
      console.log(Array.fromIterable(ackIds))
      console.log(ackIds)
      if (ackIds.size === 0) {
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
