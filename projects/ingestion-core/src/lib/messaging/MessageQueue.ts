import { Context, Data, Effect, Queue, Tracer } from 'effect'

export class MessageQueueError extends Data.TaggedError('MessageQueueError')<{
  readonly cause: unknown
}> {}

export interface Message {
  readonly data: Buffer
  readonly ack: Effect.Effect<void>
  readonly nack: Effect.Effect<void>
  readonly span?: Tracer.AnySpan
}

export class MessageQueue extends Context.Tag('MessageQueue')<
  MessageQueue,
  {
    readonly messages: Queue.Queue<Message>
    readonly errors: Queue.Queue<MessageQueueError>
  }
>() {}
