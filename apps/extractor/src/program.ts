import { Array, Config, Effect, Logger, pipe } from 'effect'

import {
  extractRowsFromSanitized,
  writeExtractedRows,
} from '@news-research/ingestion/extract'

import { MessageBatch } from './MessageBatch'
import { JobContext } from './JobContext'

const processMessageBatch = Effect.gen(function* () {
  const { runId, concurrency, startedAt } = yield* JobContext
  const messages = yield* MessageBatch

  const rows = yield* pipe(
    messages,
    Effect.forEach(
      (message) =>
        Effect.gen(function* () {
          const incoming = yield* message.read
          const rows = yield* extractRowsFromSanitized({
            runId,
            observationId: incoming.observationId,
            pointer: incoming.pointer,
            extractedAt: startedAt,
          })
          yield* message.ack
          return rows
        }),
      { concurrency }
    ),
    Effect.andThen(Array.flatten)
  )

  yield* writeExtractedRows({
    runId,
    rows,
    extractedAt: startedAt,
  })
})

export const Program = Effect.gen(function* () {
  const logLevel = yield* Config.logLevel('LOG_LEVEL')

  yield* processMessageBatch.pipe(
    Effect.provide(Logger.minimumLogLevel(logLevel))
  )
})
