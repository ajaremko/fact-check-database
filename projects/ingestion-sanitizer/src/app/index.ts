import { Cause, Clock, Effect, Option, Record, Schema } from 'effect'

import {
  QueueMessage,
  takeMessage,
  takeError,
} from '@fact-check-database/core-io'
import { StorageObjectAttributesSchema } from '@fact-check-database/core-contracts/gcp/v1'

import { sanitizeObservation } from './sanitizeObservation'
import { SanitizerPolicyConfig } from './SanitizerPolicyConfig'

const decodeAttributes = StorageObjectAttributesSchema.pipe(
  Schema.pick('bucketId', 'objectId'),
  Schema.decodeUnknown
)

/**
 * Sanitizes the observation a message points to, then acks or nacks it.
 *
 * Every failure is logged once, at `error`, and settled here so one message
 * can never stop the consumer: a `ParseError` is acked, since retrying an
 * unparseable record can't succeed, and anything else, defects included, is
 * nacked so Pub/Sub retries it and eventually dead-letters it.
 */
export function processMessage(envelope: QueueMessage) {
  const sanitize = Effect.gen(function* () {
    // Carry the feeder's request annotations onto this message's lines,
    // except `adapter`, which would label the app's own lines as core-io's
    yield* Effect.annotateLogsScoped(
      Record.remove(envelope.annotations ?? {}, 'adapter')
    )
    yield* Effect.logInfo('Message received')
    const { deliveryAttempt } = envelope.message
    if (deliveryAttempt !== undefined && deliveryAttempt > 1) {
      yield* Effect.logWarning('Message redelivered')
    }

    return yield* Effect.gen(function* () {
      const policy = yield* SanitizerPolicyConfig
      const incoming = yield* decodeAttributes(envelope.message.attributes)
      // Set here as well as in sanitizeObservation, whose own annotations
      // close with it, so the failure line below can name the record
      yield* Effect.annotateLogsScoped({
        'input.bucket': incoming.bucketId,
        'input.object': incoming.objectId,
      })
      const timestamp = yield* Clock.currentTimeMillis

      yield* sanitizeObservation({
        pointer: {
          bucket: incoming.bucketId,
          object: incoming.objectId,
        },
        policy,
        timestamp,
      })

      yield* envelope.ack
    }).pipe(
      Effect.catchAllCause((cause) => {
        const tag = Option.match(Cause.failureOption(cause), {
          onNone: () => 'Defect',
          onSome: (error) => error._tag,
        })
        const outcome = tag === 'ParseError' ? 'ack' : 'nack'
        return Effect.logError('Sanitization failed', cause).pipe(
          Effect.annotateLogs({
            'error._tag': tag,
            'message.outcome': outcome,
          }),
          Effect.andThen(outcome === 'ack' ? envelope.ack : envelope.nack)
        )
      })
    )
  }).pipe(Effect.scoped)

  return envelope.span
    ? Effect.withParentSpan(sanitize, envelope.span)
    : sanitize
}

export const App = Effect.gen(function* () {
  const handleMessages = takeMessage.pipe(
    Effect.andThen(processMessage),
    Effect.forever
  )

  // A queue-level failure stops the service; it is logged once, as fatal,
  // where the service exits
  const handleErrors = takeError.pipe(Effect.andThen(Effect.fail))

  yield* Effect.logInfo('Listening for messages')

  yield* Effect.all([handleMessages, handleErrors], {
    concurrency: 'unbounded',
  })
})
