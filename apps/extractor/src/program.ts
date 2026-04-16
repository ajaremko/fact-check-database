import { Array, Effect, Option } from 'effect'

import {
  extractRowsFromSanitized,
  writeExtractedRows,
} from '../../../packages/ingestion/dist/lib/steps/extract'

import { JobContext, withJobContextAnnotations } from './JobContext'
import { Message, MessageBatch } from './MessageBatch'
import { Publisher } from './Publisher'

function processMessage(message: Message) {
  return Effect.gen(function* () {
    const incoming = yield* message.read
    const job = yield* JobContext
    const rows = yield* extractRowsFromSanitized({
      runId: job.runId,
      observationId: incoming.observationId,
      pointer: incoming.pointer,
      extractedAt: job.startedAt,
    })
    yield* message.ack
    return rows
  })
}

export const Program = withJobContextAnnotations(
  Effect.gen(function* () {
    const job = yield* JobContext
    const messages = yield* MessageBatch
    const publisher = yield* Publisher

    // process all messages with configured concurrency
    yield* Effect.logDebug(`Processing ${messages.length} messages`)
    const tasks = Array.map(messages, processMessage)
    const results = yield* Effect.all(tasks, {
      concurrency: job.concurrency,
      mode: 'either', // 'either' ensures all tasks are attempted
    })

    // log success rate
    const successes = Array.filterMap(results, Option.getRight)
    yield* Effect.logDebug(
      `Processed ${successes.length} of ${messages.length} messages`
    )

    // write rows to storage and publish event
    const rows = Array.flatten(successes)
    const event = yield* writeExtractedRows({
      runId: job.runId,
      rows,
      extractedAt: job.startedAt,
    })
    yield* publisher.publish(event)
  })
)
