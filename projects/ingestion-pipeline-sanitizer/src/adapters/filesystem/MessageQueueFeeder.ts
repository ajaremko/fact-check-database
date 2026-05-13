import { Config, Effect, Layer } from 'effect'
import { FileSystem } from '@effect/platform'

import { MessageQueue } from '@news-research/ingestion-messaging'

const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const inputDir = yield* Config.string('MESSAGE_QUEUE_INPUT_DIR')
  const contents = yield* fs.readDirectory(inputDir)

  const { messages } = yield* MessageQueue.MessageQueue

  for (const file of contents) {
    const path = `${inputDir}/${file}`
    const data = yield* fs.readFile(path)
    yield* messages.offer({
      ack: Effect.void,
      nack: Effect.void,
      data: Buffer.from(data),
    })
  }
})

export const layer = Layer.effectDiscard(make)
