import { Effect, pipe, Schema } from 'effect'

import {
  type StorageWriter,
  type StorageReader,
  ObservationSanitized,
  sanitizeObservation,
} from '@news-research/ingestion/steps/sanitize'
import { ObservationIngested } from '@news-research/ingestion/steps/ingest'
import { Publisher, MessageQueue } from '@news-research/ingestion/messaging'

import { SanitizerPolicyConfig } from './SanitizerPolicyConfig'
import { Node } from '@news-research/ingestion/util'

const decodeIncoming = pipe(
  ObservationIngested,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeOutgoing = pipe(
  ObservationSanitized,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

function processMessage(message: MessageQueue.Message) {
  return Effect.gen(function* () {
    const policy = yield* SanitizerPolicyConfig
    const incoming = yield* decodeIncoming(message.data)

    yield* Effect.logDebug('Sanitizing observation')
    const events = yield* sanitizeObservation({
      observationId: incoming.observationId,
      pointer: incoming.pointer,
      policy,
    })

    for (const event of events) {
      const data = yield* encodeOutgoing(event)
      yield* Publisher.publish(data)
    }

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
    Effect.annotateLogs({ handler: 'message' }),
    Effect.forever
  )

  const handleErrors = errors.take.pipe(
    Effect.tap(Effect.logError),
    Effect.andThen((err) => Effect.die(err.cause)),
    Effect.annotateLogs({ handler: 'error' })
  )

  yield* Effect.logDebug('Listening for messages...')

  yield* Effect.all([handleMessages, handleErrors], {
    concurrency: 'unbounded',
  })
})
