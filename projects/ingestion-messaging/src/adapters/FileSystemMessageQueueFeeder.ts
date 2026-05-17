import { Config, Effect, Layer, Record } from 'effect'
import { FileSystem } from '@effect/platform'

import { MessageQueue } from '../MessageQueue'

function process(data: Buffer) {
  return Effect.gen(function* () {
    const { messages } = yield* MessageQueue
    const span = yield* Effect.currentSpan
    const annotations = yield* Effect.logAnnotations.pipe(
      Effect.map(Record.fromEntries)
    )
    yield* Effect.asyncEffect<void, void, never, never, never, never>(
      (resume) =>
        Effect.asVoid(
          messages.offer({
            data,
            ack: Effect.sync(() => resume(Effect.void)),
            nack: Effect.sync(() => resume(Effect.void)),
            span,
            annotations,
          })
        )
    )
  })
}

const make = Effect.gen(function* () {
  const inputDir = yield* Config.string('MESSAGE_QUEUE_INPUT_DIR')

  yield* Effect.logTrace(`Processing messages in directory: ${inputDir}`)
  const fs = yield* FileSystem.FileSystem
  const contents = yield* fs.readDirectory(inputDir)

  for (const file of contents) {
    const path = `${inputDir}/${file}`
    yield* Effect.logTrace(`Processing message: ${path}`)
    const data = yield* fs.readFile(path)
    yield* process(Buffer.from(data)).pipe(
      Effect.withSpan('processMessage'),
      Effect.annotateLogs({ 'message.path': path })
    )
  }
})

export const layer = Layer.effectDiscard(make)
