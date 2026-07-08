import { Effect, Queue, Layer } from 'effect'

import {
  MessageQueue,
  QueueMessage,
  MessageQueueError,
} from '../ports/MessageQueue'

/** Creates the pair of unbounded in-process queues backing this adapter. */
const acquire = Effect.gen(function* () {
  const messages = yield* Queue.unbounded<QueueMessage>()
  const errors = yield* Queue.unbounded<MessageQueueError>()
  return { messages, errors }
})

/** Shuts down both queues created by {@link acquire}. */
function release(resource: Effect.Effect.Success<typeof acquire>) {
  return Effect.gen(function* () {
    yield* Queue.shutdown(resource.messages)
    yield* Queue.shutdown(resource.errors)
  })
}

/** Scoped effect building a {@link MessageQueue} backed by in-process `Queue`s, shut down on scope close. */
export const make = Effect.acquireRelease(acquire, release).pipe(
  Effect.map(({ messages, errors }) => MessageQueue.of({ messages, errors }))
)

/**
 * Layer providing {@link MessageQueue} backed by in-process queues. Test
 * double — used as the `MessageQueue` dependency in specs that need a real
 * queue without a live transport.
 */
export const layer = Layer.scoped(MessageQueue, make)
