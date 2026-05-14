import { Clock, Effect, pipe, Schema } from 'effect'

import {
  takeMessage,
  takeError,
  QueueMessage,
  publish,
} from '@news-research/ingestion-messaging'
import { ObservationIngestedSchema } from '@news-research/ingestion-pipeline/ingest/contracts/v1'
import * as Node from '@news-research/ingestion-data/Node'
import { sanitizeObservation } from '@news-research/ingestion-pipeline/sanitize'

import { SanitizerPolicyConfig } from './SanitizerPolicyConfig'

const decodeIncoming = pipe(
  ObservationIngestedSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeOutgoing = pipe(
  Schema.Object,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

function processMessage(message: QueueMessage) {
  const effect = Effect.gen(function* () {
    const policy = yield* SanitizerPolicyConfig
    const incoming = yield* decodeIncoming(message.data)
    const timestamp = yield* Clock.currentTimeMillis

    yield* Effect.logInfo('Sanitizing observation')
    const event = yield* sanitizeObservation({
      pointer: incoming.pointer,
      policy,
      timestamp,
    })

    const data = yield* encodeOutgoing(event)
    yield* publish(data)

    yield* message.ack
  }).pipe(
    Effect.tapErrorCause(Effect.logError),
    Effect.catchTags({
      ParseError: () => message.ack,
      PublisherError: () => message.nack,
      StorageReadError: () => message.nack,
      StorageWriteError: () => message.nack,
    })
  )
  if (message.span) {
    return Effect.withParentSpan(effect, message.span)
  }
  return effect
}

export const Program = Effect.gen(function* () {
  const handleMessages = takeMessage.pipe(
    Effect.andThen(processMessage),
    Effect.forever
  )

  const handleErrors = takeError.pipe(
    Effect.tap(Effect.logError),
    Effect.andThen((err) => Effect.die(err.cause))
  )

  yield* Effect.logDebug('Listening for messages...')

  yield* Effect.all([handleMessages, handleErrors], {
    concurrency: 'unbounded',
  })
})
