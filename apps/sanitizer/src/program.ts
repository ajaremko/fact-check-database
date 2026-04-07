import { Config, Effect, Logger, Queue } from 'effect'

import { sanitizeRawObservation } from '@news-research/ingestion/sanitize'

import { MessageQueue } from './ports/MessageQueue'
import { SanitizerPolicyDocument } from './ports/SanitizerPolicyDocument'

const readConfig = Effect.gen(function* () {
  const logLevel = yield* Config.logLevel('LOG_LEVEL')
  return { logLevel }
})

export const Program = Effect.gen(function* () {
  const { logLevel } = yield* readConfig
  const policyDocument = yield* SanitizerPolicyDocument
  const { messages, errors } = yield* MessageQueue
  const policy = yield* policyDocument.read

  const handleMessages = Queue.take(messages).pipe(
    Effect.andThen((message) =>
      Effect.gen(function* () {
        const incoming = yield* message.read
        yield* sanitizeRawObservation(
          policy,
          incoming.observationId,
          incoming.pointer
        )
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
