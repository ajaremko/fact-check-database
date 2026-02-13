import { Config, Effect, Layer, pipe, Queue, Schema } from 'effect'
import { FileSystem } from '@effect/platform'

import { ObservationFetchedSchema } from '@news-research/contracts'
import { Node } from '@news-research/node'

import {
  MessageQueue,
  Message,
  MessageQueueError,
} from '../../ports/MessageQueue'

// Record -> JSON -> Buffer
const decodeObservationFetched = pipe(
  ObservationFetchedSchema,
  Node.parseJson(),
  Node.parseUint8Array({ encoding: 'utf-8' }),
  Schema.decode
)

export const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const inputDir = yield* Config.string('MESSAGE_QUEUE_INPUT_DIR')
  const contents = yield* fs.readDirectory(inputDir)

  const queue = yield* Queue.unbounded<Message>()

  for (const file of contents) {
    yield* queue.offer({
      ack: Effect.void,
      nack: Effect.void,
      read: Effect.gen(function* () {
        const path = `${inputDir}/${file}`
        const data = yield* fs.readFile(path)
        return yield* decodeObservationFetched(data)
      }).pipe(Effect.mapError((cause) => new MessageQueueError({ cause }))),
    })
  }

  return MessageQueue.of({ queue })
})

export const layer = Layer.effect(MessageQueue, make)
