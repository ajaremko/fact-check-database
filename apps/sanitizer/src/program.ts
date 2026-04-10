import { Config, Effect, Logger, Queue } from 'effect'

import { sanitizeRawObservation } from '@news-research/ingestion/sanitize'

import { MessageQueue } from './MessageQueue'
import { SanitizerPolicyConfig } from './SanitizerPolicyConfig'
import { Publisher } from './Publisher'

export const Program = Effect.gen(function* () {
  const publisher = yield* Publisher
  const policy = yield* SanitizerPolicyConfig
  const { messages, errors } = yield* MessageQueue
  const logLevel = yield* Config.logLevel('LOG_LEVEL')

  const handleMessages = Queue.take(messages).pipe(
    Effect.andThen((message) =>
      Effect.gen(function* () {
        const incoming = yield* message.read
        const outgoing = yield* sanitizeRawObservation({
          id: incoming.observationId,
          pointer: incoming.pointer,
          policy,
        })
        for (const event of outgoing) {
          yield* publisher.publish(event)
        }
      }).pipe(
        Effect.andThen(() => message.ack),
        Effect.catchTag('ParseError', () => message.ack),
        Effect.catchAll(() => message.nack)
      )
    ),
    Effect.forever
  )

  const handleErrors = Queue.take(errors).pipe(
    Effect.tap((error) =>
      Effect.logError(`Message queue error: ${error.cause}`)
    ),
    Effect.andThen(Effect.fail)
  )

  yield* Effect.logInfo('Listening for messages...')

  yield* Effect.all([handleMessages, handleErrors], {
    concurrency: 'unbounded',
  }).pipe(Effect.provide(Logger.minimumLogLevel(logLevel)))
})
