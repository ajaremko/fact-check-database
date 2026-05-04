import { Config, Effect, Layer } from 'effect'
import { FileSystem } from '@effect/platform'

import * as MessageQueue from '../MessageQueue'

function process(id: string, data: Buffer) {
  return Effect.gen(function* () {
    const { messages } = yield* MessageQueue.MessageQueue
    const span = yield* Effect.currentSpan
    yield* Effect.asyncEffect<void, void, never, never, never, never>(
      (resume) =>
        Effect.asVoid(
          messages.offer({
            data,
            ack: Effect.sync(() => resume(Effect.void)),
            nack: Effect.sync(() => resume(Effect.void)),
            span,
          })
        )
    )
  }).pipe(Effect.withSpan(id))
}

const make = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem

  const inputDir = yield* Config.string('MESSAGE_QUEUE_INPUT_DIR')
  const contents = yield* fs.readDirectory(inputDir)

  for (const file of contents) {
    const path = `${inputDir}/${file}`
    const data = yield* fs.readFile(path)
    yield* process(path, Buffer.from(data))
  }
})

export const layer = Layer.effectDiscard(make)
