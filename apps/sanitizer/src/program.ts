import { Effect } from 'effect'

import { sanitizeRawObservation } from '@news-research/ingestion/sanitize'

import { MessageQueue } from './MessageQueue'
import { SanitizerPolicyConfig } from './SanitizerPolicyConfig'
import { Publisher } from './Publisher'

export const Program = Effect.gen(function* () {
  const publisher = yield* Publisher
  const policy = yield* SanitizerPolicyConfig
  const { messages, errors } = yield* MessageQueue

  const handleMessages = messages.take.pipe(
    Effect.andThen((message) =>
      message.read.pipe(
        Effect.andThen((incoming) =>
          sanitizeRawObservation({
            id: incoming.observationId,
            pointer: incoming.pointer,
            policy,
          }).pipe(
            Effect.andThen(Effect.forEach((event) => publisher.publish(event))),
            Effect.andThen(() => message.ack),
            Effect.catchTag('ParseError', () => message.ack),
            Effect.catchAll(() => message.nack),
            Effect.annotateLogs({
              observationId: incoming.observationId,
              source: incoming.source.name,
              url: incoming.url,
              collection: incoming.source.collection,
              handler: 'message',
            })
          )
        )
      )
    ),
    Effect.forever
  )

  const handleErrors = errors.take.pipe(
    Effect.tap(Effect.logError),
    Effect.andThen(Effect.fail),
    Effect.annotateLogs({ handler: 'error' })
  )

  yield* Effect.logInfo('Listening for messages...')

  yield* Effect.all([handleMessages, handleErrors], {
    concurrency: 'unbounded',
  })
})
