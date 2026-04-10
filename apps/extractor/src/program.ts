import { Config, Effect, Logger } from 'effect'

import { extractRowsFromSanitized } from '@news-research/ingestion/extract'

import { MessageBatch } from './MessageBatch'

const readConfig = Effect.gen(function* () {
  const logLevel = yield* Config.logLevel('LOG_LEVEL')
  return { logLevel }
})

export const Program = Effect.gen(function* () {
  const messages = yield* MessageBatch
  const { logLevel } = yield* readConfig

  yield* Effect.forEach(messages, (message) =>
    Effect.gen(function* () {
      const incoming = yield* message.read
      const rows = yield* extractRowsFromSanitized(
        incoming.observationId,
        incoming.pointer
      )
      yield* Effect.logInfo(
        `Extracted ${rows.length} rows for observation ${incoming.observationId}`
      )
    })
  ).pipe(Effect.provide(Logger.minimumLogLevel(logLevel)))
})
