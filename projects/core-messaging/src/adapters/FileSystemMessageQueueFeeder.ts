import { Config, Effect, Layer } from 'effect'

import { enqueueAndAwaitOutcome } from '../internal/enqueueAndAwaitOutcome'
import { readDirectoryMessages } from '../internal/readDirectoryMessages'

export const make = Effect.gen(function* () {
  const inputDir = yield* Config.string('MESSAGE_QUEUE_INPUT_DIR')

  yield* Effect.logTrace(`Processing messages in directory: ${inputDir}`)
  const entries = yield* readDirectoryMessages(inputDir)

  for (const { path, message } of entries) {
    yield* Effect.logTrace(`Processing message: ${path}`)
    yield* enqueueAndAwaitOutcome({
      message,
      onAck: Effect.void,
      onNack: Effect.void,
    }).pipe(
      Effect.withSpan('processMessage'),
      Effect.annotateLogs({ 'message.path': path })
    )
  }
})

export const layer = Layer.effectDiscard(make)
