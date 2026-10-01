import { Array, Cause, Context, Effect, Option, Record, Schema } from 'effect'

import { MessageBatch, BatchMessage } from '@fact-check-database/core-io'
import { StorageObjectAttributesSchema } from '@fact-check-database/core-contracts/gcp/v1'
import {
  ExtractionJobCompletedKey,
  ExtractionJobCompletedSchema,
} from '@fact-check-database/ingestion-contracts/logging/v1'

import { dedupeFactCheckRows } from '../integration/dedupeFactCheckRows'

import { extractFactChecks } from './extractFactChecks'
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

/**
 * Extracts the rows for one message and acks it. A failure is logged once,
 * at `error`, and left unacked, so Pub/Sub redelivers the message to a later
 * run.
 */
function processMessage(envelope: BatchMessage) {
  const process = Effect.gen(function* () {
    // Carry the batch adapter's annotations onto this message's lines,
    // except `adapter`, which would label the app's own lines as core-io's
    yield* Effect.annotateLogsScoped(
      Record.remove(envelope.annotations ?? {}, 'adapter')
    )
    const { deliveryAttempt } = envelope.message
    if (deliveryAttempt !== undefined && deliveryAttempt > 1) {
      yield* Effect.logWarning('Message redelivered')
    }

    const job = yield* JobContext
    const incoming = yield* decodeAttributes(envelope.message.attributes)
    // Set here as well as in extractFactChecks, whose own annotations close
    // with it, so the failure line below can name the record
    yield* Effect.annotateLogsScoped({
      'input.bucket': incoming.bucketId,
      'input.object': incoming.objectId,
    })
    const rows = yield* extractFactChecks({
      extractorRunId: job.runId,
      pointer: {
        bucket: incoming.bucketId,
        object: incoming.objectId,
      },
      extractedAt: job.startedAt,
    }).pipe(
      Effect.tapErrorCause((cause) =>
        Effect.logError('Message processing failed', cause).pipe(
          Effect.annotateLogs({
            'error._tag': Option.match(Cause.failureOption(cause), {
              onNone: () => 'Defect',
              onSome: (error) => error._tag,
            }),
          })
        )
      )
    )
    yield* envelope.ack
    return rows
  }).pipe(Effect.scoped, Effect.withSpan('processMessage'))

  return envelope.span ? Effect.withParentSpan(process, envelope.span) : process
}

export const App = Effect.gen(function* () {
  const job = yield* JobContext
  const messages = yield* MessageBatch

  // process all messages with configured concurrency
  const tasks = Array.map(messages, processMessage)
  const results = yield* Effect.all(tasks, {
    concurrency: job.concurrency,
    mode: 'either', // 'either' ensures all tasks are attempted
  })
  const successes = Array.filterMap(results, Option.getRight)

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

  if (rows.length === 0) {
    yield* Effect.logInfo('No batch written')
  } else {
    yield* writeBatch({
      extractorRunId: job.runId,
      rows,
      timestamp: job.startedAt,
      type: 'fact_checks',
    })
  }

  // The event fields feed the extraction dashboard, which counts one line per
  // event, so they are attached to this line only rather than scoped. Failed
  // messages are redelivered to a later run, so a run with failures is a
  // warning rather than an error.
  const failures = tasks.length - successes.length
  const completed =
    failures === 0
      ? Effect.logInfo('Extractor job completed')
      : Effect.logWarning('Extractor job completed')
  yield* completed.pipe(
    Effect.annotateLogs(
      ExtractionJobCompletedSchema.make({
        event: ExtractionJobCompletedKey,
        'job.tasks': tasks.length,
        'job.successes': successes.length,
        'job.failures': failures,
        'job.rowsExtracted': rows.length,
      })
    )
  )
})
