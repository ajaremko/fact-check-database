import { Clock, Effect, Schema } from 'effect'

import {
  QueueMessage,
  takeMessage,
  takeError,
} from '@fact-check-database/core-io'
import { StorageObjectAttributesSchema } from '@fact-check-database/core-contracts/gcp/v1'

import { SanitizerPolicyConfig } from '../ports/SanitizerPolicyConfig'

import { sanitizeObservation } from './sanitizeObservation'

const decodeAttributes = StorageObjectAttributesSchema.pipe(
  Schema.pick('bucketId', 'objectId'),
  Schema.decodeUnknown
)

function processMessage(envelope: QueueMessage) {
  let effect = Effect.gen(function* () {
    const policy = yield* SanitizerPolicyConfig
    const incoming = yield* decodeAttributes(envelope.message.attributes)
    const timestamp = yield* Clock.currentTimeMillis

    yield* Effect.logInfo('Sanitizing observation')
    yield* sanitizeObservation({
      pointer: {
        bucket: incoming.bucketId,
        object: incoming.objectId,
      },
      policy,
      timestamp,
    })

    // const data = yield* encodeOutgoing(event)
    // yield* publish(data)

    yield* envelope.ack
  }).pipe(
    Effect.tapErrorCause(Effect.logError),
    Effect.catchTags({
      ParseError: () => envelope.ack,
      // PublisherError: () => envelope.nack,
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

export const App = Effect.gen(function* () {
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
