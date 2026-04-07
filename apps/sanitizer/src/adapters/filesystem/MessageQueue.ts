import { Config, Effect, Layer, pipe, Queue, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { IngestionAttemptedSchema } from '@news-research/ingestion/ingest'
import { Node } from '@news-research/node'

import {
  MessageQueue,
  Message,
  MessageQueueError,
} from '../../ports/MessageQueue'

const decodeObservationFetched = pipe(
  IngestionAttemptedSchema,
  Node.parseJson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

const acquire = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const inputDir = yield* Config.string('MESSAGE_QUEUE_INPUT_DIR')
  const contents = yield* fs.readDirectory(inputDir)

  const messages = yield* Queue.unbounded<Message>()
  const errors = yield* Queue.unbounded<MessageQueueError>()

  for (const file of contents) {
    const path = `${inputDir}/${file}`
    const data = yield* fs.readFile(path)
    yield* messages.offer({
      ack: Effect.void,
      nack: Effect.void,
      read: decodeObservationFetched(data),
    })
  }

  return { messages, errors }
})

function release(resource: Effect.Effect.Success<typeof acquire>) {
  return Effect.gen(function* () {
    yield* Queue.shutdown(resource.messages)
    yield* Queue.shutdown(resource.errors)
  })
}

export const make = Effect.acquireRelease(acquire, release).pipe(
  Effect.map(({ messages, errors }) => MessageQueue.of({ messages, errors }))
)

export const layer = Layer.scoped(MessageQueue, make)
