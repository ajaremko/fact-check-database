import { Array, Effect, Option, Schema, pipe } from 'effect'

import {
  type StorageWriter,
  type StorageReader,
  extractRowsFromSanitized,
  writeExtractedRows,
  ExtractionBatchReady,
} from '@news-research/ingestion/steps/extract'
import { Publisher, MessageBatch } from '@news-research/ingestion/messaging'
import { ObservationSanitized } from '@news-research/ingestion/steps/sanitize'
import { Node } from '@news-research/ingestion/util'

import { JobContext, withJobContextAnnotations } from './JobContext'

const decodeIncoming = pipe(
  ObservationSanitized,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

const encodeOutgoing = pipe(
  ExtractionBatchReady,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

function processMessage(message: MessageBatch.Message) {
  return Effect.gen(function* () {
    const incoming = yield* decodeIncoming(message.data)
    const job = yield* JobContext
    const rows = yield* extractRowsFromSanitized({
      extractionId: job.runId,
      observationId: incoming.observationId,
      pointer: incoming.pointer,
      extractedAt: job.startedAt,
    })
    yield* message.ack
    return rows
  }).pipe(Effect.withSpan('processMessage'))
}

export type Program = Effect.Effect<
  void,
  Error,
  | JobContext
  | StorageReader.StorageReader
  | MessageBatch.MessageBatch
  | Publisher.Publisher
  | StorageWriter.StorageWriter
>

export const Program: Program = withJobContextAnnotations(
  Effect.gen(function* () {
    const job = yield* JobContext
    const messages = yield* MessageBatch.MessageBatch

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

    // write rows to storage
    const rows = Array.flatten(successes)
    const outgoing = yield* writeExtractedRows({
      runId: job.runId,
      rows,
      extractedAt: job.startedAt,
    })

    // publish message
    const data = yield* encodeOutgoing(outgoing)
    yield* Publisher.publish(data)
  }).pipe(
    Effect.tapError(Effect.logError),
    Effect.mapError(() => new Error('Program failed'))
  )
)
