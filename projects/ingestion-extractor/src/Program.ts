import { Array, Context, Effect, Option, Schema, pipe } from 'effect'

import * as Node from '@news-research/core-data/Node'
import {
  extractFactChecks,
  writeBatch,
} from '@news-research/ingestion-pipeline/extract'
import {
  MessageBatch,
  BatchMessage,
  // publish,
} from '@news-research/core-io'
import { ObservationSanitizedSchema } from '@news-research/ingestion-pipeline/sanitize/contracts/v1'

interface JobContext {
  runId: string
  concurrency: number
  startedAt: number
}

export const JobContext = Context.GenericTag<JobContext>('JobContext')

const decodeIncoming = pipe(
  ObservationSanitizedSchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

// const encodeOutgoing = pipe(
//   Schema.Object,
//   Node.parseJson(),
//   Node.parseBuffer({ encoding: 'utf-8' }),
//   Schema.encode
// )

function processMessage(envelope: BatchMessage) {
  let effect = Effect.gen(function* () {
    const incoming = yield* decodeIncoming(envelope.message.data)
    const job = yield* JobContext
    const rows = yield* extractFactChecks({
      extractionId: job.runId,
      observationId: incoming.content_lineage_id,
      pointer: incoming.pointer,
      extractedAt: job.startedAt,
    })
    yield* envelope.ack
    return rows
  }).pipe(Effect.withSpan('processMessage'))

  if (envelope.annotations) {
    effect = Effect.annotateLogs(effect, envelope.annotations)
  }

  if (envelope.span) {
    effect = Effect.withParentSpan(effect, envelope.span)
  }

  return effect
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

  yield* Effect.logInfo(`Extractor job run ${job.runId} completed`).pipe(
    Effect.annotateLogs({
      event: 'extractor_job_completed',
      'job.tasks': tasks.length,
      'job.successes': successes.length,
      'job.failures': tasks.length - successes.length,
      'job.rowsExtracted': rows.length,
    })
  )

  // publish message
  // const outgoing =
  yield* writeBatch({
    runId: job.runId,
    rows,
    timestamp: job.startedAt,
    type: 'fact_checks',
  })
  // const data = yield* encodeOutgoing(outgoing)
  // yield* publish(data)
})
