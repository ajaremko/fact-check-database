import { Config, Effect, Layer } from 'effect'

import { MessageBatch, BatchMessage } from '../ports/MessageBatch'

import { readDirectoryMessages } from '../internal/readDirectoryMessages'

/**
 * Builds a {@link MessageBatch} by eagerly reading every file in the
 * `MESSAGE_QUEUE_INPUT_DIR` directory. Each message's `ack` is a no-op,
 * since there's nothing to acknowledge for a local directory read.
 */
export const make = Effect.gen(function* () {
  const inputDir = yield* Config.string('MESSAGE_QUEUE_INPUT_DIR')

  yield* Effect.logTrace(`Creating message batch from directory: ${inputDir}`)
  const entries = yield* readDirectoryMessages(inputDir)

  return yield* Effect.forEach(entries, ({ path, message }) =>
    Effect.gen(function* () {
      yield* Effect.logTrace(`Adding ${path} to batch`)
      const span = yield* Effect.makeSpan(path)
      const batchMessage: BatchMessage = {
        message,
        ack: Effect.void,
        annotations: { 'message.path': path },
        span,
      }
      return batchMessage
    })
  )
})

/** Layer providing {@link MessageBatch} from a local directory. Development adapter. */
export const layer = Layer.effect(MessageBatch, make)
