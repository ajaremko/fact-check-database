import { Context, Data, Effect, Queue, Layer, ParseResult } from 'effect'

import { IngestionAttempted } from '../../../packages/ingestion/dist/lib/steps/ingest'

export class MessageQueueError extends Data.TaggedError('MessageQueueError')<{
  readonly cause: unknown
}> {}

export interface Message {
  readonly read: Effect.Effect<IngestionAttempted, ParseResult.ParseError>
  readonly ack: Effect.Effect<void>
  readonly nack: Effect.Effect<void>
}

export class MessageQueue extends Context.Tag('MessageQueue')<
  MessageQueue,
  {
    readonly messages: Queue.Queue<Message>
    readonly errors: Queue.Queue<MessageQueueError>
  }
>() {}

const acquire = Effect.gen(function* () {
  const messages = yield* Queue.unbounded<Message>()
  const errors = yield* Queue.unbounded<MessageQueueError>()
  return { messages, errors }
})

function release(resource: Effect.Effect.Success<typeof acquire>) {
  return Effect.gen(function* () {
    yield* Queue.shutdown(resource.messages)
    yield* Queue.shutdown(resource.errors)
  })
}

const make = Effect.acquireRelease(acquire, release).pipe(
  Effect.map(({ messages, errors }) => MessageQueue.of({ messages, errors }))
)

export const layer = Layer.scoped(MessageQueue, make)
