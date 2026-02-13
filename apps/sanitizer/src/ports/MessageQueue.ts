import { Context, Data, Effect, Queue } from 'effect'

import { ObservationFetched } from '@news-research/contracts'

export class MessageQueueError extends Data.TaggedError('MessageQueueError')<{
  readonly cause: unknown
}> {}

export interface Message {
  readonly read: Effect.Effect<ObservationFetched, MessageQueueError>
  readonly ack: Effect.Effect<void>
  readonly nack: Effect.Effect<void>
}

export class MessageQueue extends Context.Tag('MessageQueue')<
  MessageQueue,
  {
    readonly queue: Queue.Queue<Message>
  }
>() {}
