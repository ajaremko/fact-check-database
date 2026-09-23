import { Array, Context, Effect, Option, Schema } from 'effect'

import { MessageBatch, BatchMessage } from '@fact-check-database/core-io'
import { StorageObjectAttributesSchema } from '@fact-check-database/core-contracts/gcp/v1'

import { dedupeFactCheckRows } from '../integration/dedupeFactCheckRows'

import { extractFactChecks } from './extractFactChecks'
import { logExtractionJobCompleted } from './logging'
import { writeBatch } from './writeBatch'

interface JobContext {
  runId: string
  concurrency: number
  startedAt: number
}

export const JobContext = Context.GenericTag<JobContext>('JobContext')

const decodeAttributes = StorageObjectAttributesSchema.pipe(
  Schema.pick('bucketId', 'objectId'),
  Schema.decodeUnknown
)

function processMessage(envelope: BatchMessage) {
  let effect = Effect.gen(function* () {
    const job = yield* JobContext
    const incoming = yield* decodeAttributes(envelope.message.attributes)
    const rows = yield* extractFactChecks({
      extractorRunId: job.runId,
      pointer: {
        bucket: incoming.bucketId,
        object: incoming.objectId,
      },
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

export const App = Effect.gen(function* () {
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

  // drop repeats of the same item from the same observation (e.g. a message
  // delivered twice) before writing
  const extracted = Array.flatten(successes)
  const rows = dedupeFactCheckRows(extracted)
  if (rows.length < extracted.length) {
    yield* Effect.logInfo('Dropped duplicate fact check rows').pipe(
      Effect.annotateLogs({
        'job.rowsExtracted': extracted.length,
        'job.duplicateRows': extracted.length - rows.length,
      })
    )
  }

  // write rows to storage, exit if no fact checks were extracted
  if (rows.length === 0) {
    yield* Effect.logWarning(
      'No fact checks extracted to be written to storage'
    )
    return
  }

  yield* logExtractionJobCompleted({
    event: 'extractor_job_completed',
    'job.tasks': tasks.length,
    'job.successes': successes.length,
    'job.failures': tasks.length - successes.length,
    'job.rowsExtracted': rows.length,
  })

  yield* writeBatch({
    extractorRunId: job.runId,
    rows,
    timestamp: job.startedAt,
    type: 'fact_checks',
  })
})
