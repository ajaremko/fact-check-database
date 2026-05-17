import { Config, Effect, Layer } from 'effect'
import { FileSystem } from '@effect/platform'

import { MessageBatch, BatchMessage } from '../MessageBatch'

const make = Effect.gen(function* () {
  const inputDir = yield* Config.string('MESSAGE_QUEUE_INPUT_DIR')

  yield* Effect.logTrace(`Creating message batch from directory: ${inputDir}`)
  const fs = yield* FileSystem.FileSystem
  const contents = yield* fs.readDirectory(inputDir)
  const messages: BatchMessage[] = []

  for (const file of contents) {
    const path = `${inputDir}/${file}`
    const data = yield* fs.readFile(path)
    yield* Effect.logTrace(`Adding ${path} to batch`)
    const span = yield* Effect.makeSpan(path)
    const annotations = {
      'message.path': path,
    }
    messages.push({
      ack: Effect.void,
      data: Buffer.from(data),
      annotations,
      span,
    })
  }

  return messages
})

export const layer = Layer.effect(MessageBatch, make)
