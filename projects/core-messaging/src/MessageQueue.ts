import { Context, Data, Effect, Queue, Record, Tracer } from 'effect'

import { MessageBody } from './MessageBody'

export class MessageQueueError extends Data.TaggedError('MessageQueueError')<{
  readonly cause: unknown
  readonly message: string
}> {}

export interface QueueMessage {
  readonly message: MessageBody
  readonly ack: Effect.Effect<void>
  readonly nack: Effect.Effect<void>
  readonly span?: Tracer.AnySpan
  readonly annotations?: Record<string, unknown>
}

export class MessageQueue extends Context.Tag('MessageQueue')<
  MessageQueue,
  {
    readonly messages: Queue.Queue<QueueMessage>
    readonly errors: Queue.Queue<MessageQueueError>
  }
>() {}

export const takeMessage = MessageQueue.pipe(
  Effect.flatMap(({ messages }) => messages.take)
)

export const takeError = MessageQueue.pipe(
  Effect.flatMap(({ errors }) => errors.take)
)
