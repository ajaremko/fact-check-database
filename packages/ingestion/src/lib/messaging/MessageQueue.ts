import { Context, Data, Effect, Queue } from 'effect'

export class MessageQueueError extends Data.TaggedError('MessageQueueError')<{
  readonly cause: unknown
}> {}

export interface Message {
  readonly data: Buffer
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
