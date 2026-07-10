import { Effect, Record } from 'effect'

import { MessageQueue } from '../ports/MessageQueue'
import { MessageBody } from '../ports/types/MessageBody'

/** Options for {@link enqueueAndAwaitOutcome}. */
export interface EnqueueAndAwaitOutcomeOptions<A, E = never> {
  /** The message to offer onto the {@link MessageQueue}. */
  readonly message: MessageBody
  /** Effect to resume with once the message is acked. */
  readonly onAck: Effect.Effect<A, E>
  /** Effect to resume with once the message is nacked. */
  readonly onNack: Effect.Effect<A, E>
}

/**
 * Offers a message onto the live MessageQueue and suspends until the
 * consumer resolves it via `ack` or `nack`, resuming with the caller-supplied
 * effect for whichever outcome occurred.
 */
export function enqueueAndAwaitOutcome<A, E = never>({
  message,
  onAck,
  onNack,
}: EnqueueAndAwaitOutcomeOptions<A, E>) {
  return Effect.gen(function* () {
    const { messages } = yield* MessageQueue
    const span = yield* Effect.currentSpan
    const annotations = yield* Effect.logAnnotations.pipe(
      Effect.map(Record.fromEntries)
    )
    return yield* Effect.asyncEffect<A, E, never, never, never, never>(
      (resume) =>
        Effect.asVoid(
          messages.offer({
            message,
            ack: Effect.sync(() => resume(onAck)),
            nack: Effect.sync(() => resume(onNack)),
            span,
            annotations,
          })
        )
    )
  })
}
