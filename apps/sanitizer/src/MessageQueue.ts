import { Context, Data, Effect, Queue, ParseResult } from 'effect'

import { IngestionAttempted } from '@news-research/ingestion/ingest'

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
