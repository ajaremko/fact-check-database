import { Clock, Effect, pipe, Schema } from 'effect'

import * as v1 from '@news-research/ingestion/contracts/v1'
import {
  type StorageWriter,
  type StorageReader,
  sanitizeObservation,
} from '@news-research/ingestion/pipeline/sanitize'
import { Publisher, MessageQueue } from '@news-research/ingestion/messaging'

import { SanitizerPolicyConfig } from './SanitizerPolicyConfig'
import { Node } from '@news-research/ingestion/data'

const decodeIncoming = pipe(
  v1.ObservationIngestedSchema,
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
  return Effect.gen(function* () {
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
  })
    .pipe(
      Effect.tapError(Effect.logError),
      Effect.catchTags({
        ParseError: () => message.ack,
        PublisherError: () => message.nack,
        StorageReadError: () => message.nack,
        StorageWriteError: () => message.nack,
      })
    )
    .pipe(Effect.withSpan('processMessage'))
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
