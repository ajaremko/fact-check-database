import { Effect } from 'effect'

import { sanitizeRawObservation } from '@news-research/ingestion/sanitize'

import { Message, MessageQueue } from './MessageQueue'
import { SanitizerPolicyConfig } from './SanitizerPolicyConfig'
import { Publisher } from './Publisher'

function processMessage(message: Message) {
  return Effect.gen(function* () {
    const policy = yield* SanitizerPolicyConfig
    const publisher = yield* Publisher
    const incoming = yield* message.read

    yield* Effect.logDebug('Sanitizing observation')
    const events = yield* sanitizeRawObservation({
      id: incoming.observationId,
      pointer: incoming.pointer,
      policy,
    })

    for (const event of events) {
      yield* publisher.publish(event)
    }

    yield* message.ack
  }).pipe(
    Effect.tapError(Effect.logError),
    Effect.catchTags({
      ParseError: () => message.ack,
      PublisherError: () => message.nack,
      StorageReadError: () => message.nack,
      StorageWriteError: () => message.nack,
    })
  )
}

export const Program = Effect.gen(function* () {
  const { messages, errors } = yield* MessageQueue

  const handleMessages = messages.take.pipe(
    Effect.andThen(processMessage),
    Effect.annotateLogs({ handler: 'message' }),
    Effect.forever
  )

  const handleErrors = errors.take.pipe(
    Effect.tap(Effect.logError),
    Effect.andThen(Effect.fail),
    Effect.annotateLogs({ handler: 'error' })
  )

  yield* Effect.logDebug('Listening for messages...')

  yield* Effect.all([handleMessages, handleErrors], {
    concurrency: 'unbounded',
  })
})
