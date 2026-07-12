import { Config, Effect, Layer } from 'effect'

import { MessageQueue } from '../ports/MessageQueue'
import { enqueueAndAwaitOutcome } from '../internal/enqueueAndAwaitOutcome'
import { readDirectoryMessages } from '../internal/readDirectoryMessages'

/**
 * Reads every file in the `MESSAGE_QUEUE_INPUT_DIR` directory and offers
 * each one onto an existing {@link MessageQueue} in turn, awaiting ack/nack
 * before moving on to the next file. Interrupts the queue once all files
 * have been processed, causing consumers to exit gracefully.
 */
export const make = Effect.gen(function* () {
  const inputDir = yield* Config.string('MESSAGE_QUEUE_INPUT_DIR')
  const { messages } = yield* MessageQueue

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

  // Interrupt the queue so that the consumer can exit gracefully
  // once all messages have been processed

  // In production, the http message queue feeder will not shut
  // down the queue, but will instead run indefinitely
  yield* messages.shutdown
})

/**
 * Layer that feeds an existing {@link MessageQueue} from a local directory.
 * Development adapter. Provides no service of its own — it only has the
 * side effect of enqueueing each file's contents while the layer builds.
 */
export const layer = Layer.effectDiscard(make)
