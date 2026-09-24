import { Config, Effect, Layer, Record } from 'effect'

import { MessageBatch, BatchMessage } from '../ports/MessageBatch'

import {
  DirectoryMessage,
  readDirectoryMessages,
} from '../internal/readDirectoryMessages'

const adapter = 'FileSystemMessageBatch'

/**
 * Builds a {@link MessageBatch} by eagerly reading every file in the
 * `MESSAGE_QUEUE_INPUT_DIR` directory. Each message's `ack` is a no-op,
 * since there's nothing to acknowledge for a local directory read.
 */
export const make = Effect.gen(function* () {
  const inputDir = yield* Config.string('MESSAGE_QUEUE_INPUT_DIR')
  yield* Effect.annotateLogsScoped({ adapter, inputDir })

  const entries = yield* readDirectoryMessages(inputDir)
  yield* Effect.annotateLogsScoped({ 'entries.length': entries.length })
  yield* Effect.logTrace('Directory messages read')

  function wrapMessage({ path, message }: DirectoryMessage) {
    return Effect.gen(function* () {
      yield* Effect.annotateLogsScoped({
        'message.path': path,
        'message.messageId': message.messageId,
      })
      const span = yield* Effect.makeSpan(path)
      const annotations = yield* Effect.logAnnotations.pipe(
        Effect.map(Record.fromEntries)
      )
      const batchMessage: BatchMessage = {
        message,
        ack: Effect.void,
        annotations,
        span,
      }
      yield* Effect.logTrace('Message added to batch')
      return batchMessage
    }).pipe(Effect.scoped)
  }

  const messages = yield* Effect.forEach(entries, wrapMessage)

  yield* Effect.annotateLogsScoped({ 'messages.length': messages.length })
  yield* Effect.logTrace('Message batch created')

  return messages
}).pipe(Effect.scoped)

/** Layer providing {@link MessageBatch} from a local directory. Development adapter. */
export const layer = Layer.effect(MessageBatch, make)
