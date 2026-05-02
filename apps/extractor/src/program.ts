import { Array, Effect, Option, Schema, pipe } from 'effect'

import {
  type StorageWriter,
  type StorageReader,
  extractFactChecks,
  writeBatch,
} from '@news-research/ingestion/pipeline/extract'
import { Publisher, MessageBatch } from '@news-research/ingestion/messaging'
import * as v1 from '@news-research/ingestion/contracts/v1'
import { Node } from '@news-research/ingestion/data'

import { JobContext, withJobContextAnnotations } from './JobContext'
import { FactChecksSchema } from './FactChecksSchema'

const decodeIncoming = pipe(
  v1.ObservationSanitizedSchema,
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

function processMessage(message: MessageBatch.Message) {
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

export type Program = Effect.Effect<
  void,
  Error,
  | JobContext
  | FactChecksSchema
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

    // write rows to storage, exit if no fact checks were extracted
    const extracted = Array.flatten(successes)
    if (extracted.length === 0) {
      yield* Effect.logWarning(
        'No fact checks extracted to be written to storage'
      )
      return
    }

    // publish message
    const schema = yield* FactChecksSchema
    const outgoing = yield* writeBatch({
      runId: job.runId,
      extracted,
      extractedAt: job.startedAt,
      datasetId: job.datasetId,
      schema,
    })
    const data = yield* encodeOutgoing(outgoing)
    yield* Publisher.publish(data)
  }).pipe(
    Effect.tapError(Effect.logError),
    Effect.mapError(() => new Error('Program failed'))
  )
)
