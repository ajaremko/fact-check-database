import { Context, Effect, Tracer } from 'effect'

import { MessageBody } from './MessageBody'

/**
 * A single message within a {@link MessageBatch}.
 *
 * Batch messages only carry an `ack` — there is no `nack`, since a batch is
 * a finite, pre-pulled set of work rather than a retryable live stream.
 */
export interface BatchMessage {
  /** The raw message payload. */
  readonly message: MessageBody
  /** Effect to run once this message has been successfully processed. */
  readonly ack: Effect.Effect<void>
  /** Tracing span captured when this message was acquired, if any. */
  readonly span?: Tracer.AnySpan
  /** Structured log annotations captured alongside this message, if any. */
  readonly annotations?: Record<string, unknown>
}

/**
 * Port for a finite, pre-pulled batch of messages.
 *
 * Use this for batch or cron-style jobs that pull a fixed set of work and
 * process it to completion, as opposed to {@link MessageQueue}, which models
 * a live, continuously-fed stream.
 */
export class MessageBatch extends Context.Tag('MessageBatch')<
  MessageBatch,
  readonly BatchMessage[]
>() {}
