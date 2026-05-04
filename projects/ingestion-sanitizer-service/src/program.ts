import { Clock, Effect, pipe, Schema } from 'effect'

import {
  Publisher,
  MessageQueue,
} from '@news-research/ingestion-core/messaging'
import type {
  StorageWriter,
  StorageReader,
} from '@news-research/ingestion-core/pipeline/shared'
import { ObservationIngestedSchema } from '@news-research/ingestion-core/pipeline/ingest/contracts/v1'
import { Node } from '@news-research/ingestion-core/data'
import { sanitizeObservation } from '@news-research/ingestion-core/pipeline/sanitize'

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

function processMessage(message: MessageQueue.Message) {
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
    yield* Publisher.publish(data)

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
  if (message.span) {
    return effect.pipe(Effect.withParentSpan(message.span))
  }
  return effect
}

export type Program = Effect.Effect<
  void,
  never,
  | SanitizerPolicyConfig
  | StorageReader.StorageReader
  | StorageWriter.StorageWriter
  | Publisher.Publisher
  | MessageQueue.MessageQueue
>

export const Program: Program = Effect.gen(function* () {
  const { messages, errors } = yield* MessageQueue.MessageQueue

  const handleMessages = messages.take.pipe(
    Effect.andThen(processMessage),
    Effect.forever
  )

  const handleErrors = errors.take.pipe(
    Effect.tap(Effect.logError),
    Effect.andThen((err) => Effect.die(err.cause))
  )

  yield* Effect.logDebug('Listening for messages...')

  yield* Effect.all([handleMessages, handleErrors], {
    concurrency: 'unbounded',
  })
})
