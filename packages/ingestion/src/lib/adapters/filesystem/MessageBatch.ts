import { Config, Effect, Layer } from 'effect'
import { FileSystem } from '@effect/platform'

import { MessageBatch } from '../../messaging'

const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const inputDir = yield* Config.string('MESSAGE_QUEUE_INPUT_DIR')
  const contents = yield* fs.readDirectory(inputDir)
  const messages: MessageBatch.Message[] = []

  for (const file of contents) {
    const path = `${inputDir}/${file}`
    const data = yield* fs.readFile(path)
    messages.push({
      ack: Effect.void,
      data: Buffer.from(data),
    })
  }

  return messages
})

export const layer = Layer.effect(MessageBatch.MessageBatch, make)
