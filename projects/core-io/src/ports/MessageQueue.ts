import { Context, Data, Effect, Queue, Record, Tracer } from 'effect'

import { MessageBody } from './MessageBody'

/** Out-of-band error reported by a {@link MessageQueue} adapter (e.g. a lost subscription connection), independent of any single message. */
export class MessageQueueError extends Data.TaggedError('MessageQueueError')<{
  readonly cause: unknown
  readonly message: string
}> {}

/**
 * A single message within a live {@link MessageQueue}.
 *
 * Unlike {@link BatchMessage}, queue messages carry both `ack` and `nack`,
 * since a queue models a continuous stream where individual messages can be
 * retried.
 */
export interface QueueMessage {
  /** The raw message payload. */
  readonly message: MessageBody
  /** Effect to run once this message has been successfully processed. */
  readonly ack: Effect.Effect<void>
  /** Effect to run to signal that processing this message failed and it should be retried/redelivered. */
  readonly nack: Effect.Effect<void>
  /** Tracing span captured when this message was received, if any. */
  readonly span?: Tracer.AnySpan
  /** Structured log annotations captured alongside this message, if any. */
  readonly annotations?: Record<string, unknown>
}

/**
 * Port for a live, continuously-fed queue of messages.
 *
 * Use this for long-running services that consume an unbounded stream and
 * need retry semantics on individual messages, as opposed to
 * {@link MessageBatch}, which models a finite, pre-pulled set of work.
 *
 * Exposes two underlying queues: `messages` for successfully received
 * messages, and `errors` for transport-level failures unrelated to any
 * single message.
 */
export class MessageQueue extends Context.Tag('MessageQueue')<
  MessageQueue,
  {
    readonly messages: Queue.Queue<QueueMessage>
    readonly errors: Queue.Queue<MessageQueueError>
  }
>() {}

/** Takes the next successfully received message off the queue, suspending until one is available. */
export const takeMessage = MessageQueue.pipe(
  Effect.flatMap(({ messages }) => messages.take)
)

/** Takes the next out-of-band transport error off the queue, suspending until one is available. */
export const takeError = MessageQueue.pipe(
  Effect.flatMap(({ errors }) => errors.take)
)
