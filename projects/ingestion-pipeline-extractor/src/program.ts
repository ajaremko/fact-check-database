import { Array, Context, Effect, Option, Schema, pipe } from 'effect'

import {
  extractFactChecks,
  writeBatch,
} from '@news-research/ingestion-pipeline/extract'
import {
  MessageBatch,
  BatchMessage,
  publish,
} from '@news-research/ingestion-messaging'
import { ObservationSanitizedSchema } from '@news-research/ingestion-pipeline/sanitize/contracts/v1'
import { Node } from '@news-research/ingestion-data'

interface JobContext {
  runId: string
  concurrency: number
  startedAt: number
  datasetId: string
}

export const JobContext = Context.GenericTag<JobContext>('JobContext')

const decodeIncoming = pipe(
  ObservationSanitizedSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeOutgoing = pipe(
  Schema.Object,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

function processMessage(message: BatchMessage) {
  return Effect.gen(function* () {
    const incoming = yield* decodeIncoming(message.data)
    const job = yield* JobContext
    const rows = yield* extractFactChecks({
      extractionId: job.runId,
      observationId: incoming.content_lineage_id,
      pointer: incoming.pointer,
      extractedAt: job.startedAt,
    })
    yield* message.ack
    return rows
  }).pipe(Effect.withSpan('processMessage'))
}

export const Program = Effect.gen(function* () {
  const job = yield* JobContext
  const messages = yield* MessageBatch

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

  // write rows to storage, exit if no fact checks were extracted
  const rows = Array.flatten(successes)
  if (rows.length === 0) {
    yield* Effect.logWarning(
      'No fact checks extracted to be written to storage'
    )
    return
  }

  // publish message
  const outgoing = yield* writeBatch({
    runId: job.runId,
    rows,
    timestamp: job.startedAt,
    datasetId: job.datasetId,
    tableId: 'fact_checks',
  })
  const data = yield* encodeOutgoing(outgoing)
  yield* publish(data)
})
