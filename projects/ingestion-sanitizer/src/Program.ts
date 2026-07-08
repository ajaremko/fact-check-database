import { Clock, Effect, pipe, Schema } from 'effect'

import {
  takeMessage,
  takeError,
  QueueMessage,
  publish,
} from '@news-research/core-io'
import { ObservationIngestedSchema } from '@news-research/ingestion-pipeline/ingest/contracts/v1'
import * as Node from '@news-research/core-data/Node'
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

function processMessage(envelope: QueueMessage) {
  let effect = Effect.gen(function* () {
    const policy = yield* SanitizerPolicyConfig
    const incoming = yield* decodeIncoming(envelope.message.data)
    const timestamp = yield* Clock.currentTimeMillis

    yield* Effect.logInfo('Sanitizing observation')
    const event = yield* sanitizeObservation({
      pointer: incoming.pointer,
      policy,
      timestamp,
    })

    const data = yield* encodeOutgoing(event)
    yield* publish(data)

    yield* envelope.ack
  }).pipe(
    Effect.tapErrorCause(Effect.logError),
    Effect.catchTags({
      ParseError: () => envelope.ack,
      PublisherError: () => envelope.nack,
      StorageReadError: () => envelope.nack,
      StorageWriteError: () => envelope.nack,
    })
  )

  if (envelope.annotations) {
    effect = Effect.annotateLogs(effect, envelope.annotations)
  }

  if (envelope.span) {
    effect = Effect.withParentSpan(effect, envelope.span)
  }

  return effect
}

export const Program = Effect.gen(function* () {
  const handleMessages = takeMessage.pipe(
    Effect.andThen(processMessage),
    Effect.forever
  )

  const handleErrors = takeError.pipe(
    Effect.andThen(Effect.fail),
    Effect.tapErrorCause(Effect.logError)
  )

  yield* Effect.logDebug('Listening for messages...')

  yield* Effect.all([handleMessages, handleErrors], {
    concurrency: 'unbounded',
  })
})
