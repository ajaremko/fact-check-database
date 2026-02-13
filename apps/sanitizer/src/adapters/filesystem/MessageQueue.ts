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

const acquire = Effect.gen(function* () {
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

  return { queue }
})

function release(resource: Effect.Effect.Success<typeof acquire>) {
  return Queue.shutdown(resource.queue)
}

export const make = Effect.acquireRelease(acquire, release).pipe(
  Effect.map(({ queue }) => MessageQueue.of({ queue })),
  Effect.scoped
)

export const layer = Layer.effect(MessageQueue, make)
