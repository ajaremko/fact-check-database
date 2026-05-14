import { Effect, Queue, Layer } from 'effect'

import * as MessageQueue from '../MessageQueue'

const acquire = Effect.gen(function* () {
  const messages = yield* Queue.unbounded<MessageQueue.QueueMessage>()
  const errors = yield* Queue.unbounded<MessageQueue.MessageQueueError>()
  return { messages, errors }
})

function release(resource: Effect.Effect.Success<typeof acquire>) {
  return Effect.gen(function* () {
    yield* Queue.shutdown(resource.messages)
    yield* Queue.shutdown(resource.errors)
  })
}

const make = Effect.acquireRelease(acquire, release).pipe(
  Effect.map(({ messages, errors }) =>
    MessageQueue.MessageQueue.of({ messages, errors })
  )
)

export const layer = Layer.scoped(MessageQueue.MessageQueue, make)
