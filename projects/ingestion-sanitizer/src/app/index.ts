import { Clock, Effect, pipe, Schema } from 'effect'

import * as Node from '@news-research/core-data/Node'
import {
  QueueMessage,
  publish,
  takeMessage,
  takeError,
} from '@news-research/core-io'
import { StorageObjectAttributesSchema } from '@news-research/core-contracts'

import { SanitizerPolicyConfig } from '../ports/SanitizerPolicyConfig'

import { sanitizeObservation } from './sanitizeObservation'

const decodeAttributes = StorageObjectAttributesSchema.pipe(
  Schema.pick('bucketId', 'objectId'),
  Schema.decodeUnknown
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
    console.log(envelope)
    const incoming = yield* decodeAttributes(envelope.message.attributes)
    const timestamp = yield* Clock.currentTimeMillis

    yield* Effect.logInfo('Sanitizing observation')
    const event = yield* sanitizeObservation({
      pointer: {
        bucket: incoming.bucketId,
        object: incoming.objectId,
      },
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
