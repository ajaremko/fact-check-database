import { Array, Clock, Context, Effect, Option, pipe, Schema } from 'effect'

import * as Node from '@news-research/ingestion-data/Node'
import { ingestFromSource } from '@news-research/ingestion-pipeline/ingest'
import { publish } from '@news-research/ingestion-messaging'

import { SourceList, Source } from './SourceList'

export interface JobContext {
  runId: string
  concurrency: number
  startedAt: number
  successThreshold: number
}

export const JobContext = Context.GenericTag<JobContext>('JobContext')

const encodeOutgoing = pipe(
  Schema.Object,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

function processTarget(source: Source, index: number) {
  return Effect.gen(function* () {
    const job = yield* JobContext
    const timestamp = yield* Clock.currentTimeMillis

    // ingest from target and publish event
    yield* Effect.logDebug(`Processing target ${index + 1}`)
    const event = yield* ingestFromSource({
      ingestionId: job.runId,
      timestamp,
      source,
    })

    const data = yield* encodeOutgoing(event)
    yield* publish(data)
  }).pipe(
    Effect.tapErrorCause(Effect.logError),
    Effect.annotateLogs({
      'source.index': index,
    }),
    Effect.withSpan('processTarget')
  )
}

export const Program = Effect.gen(function* () {
  const job = yield* JobContext
  const { sources } = yield* SourceList
  yield* Effect.logDebug(`Starting job ${job.runId}.`)

  // process all targets with configured concurrency
  yield* Effect.logDebug(`Processing ${sources.length} targets`)
  const tasks = Array.map(sources, processTarget)
  const results = yield* Effect.all(tasks, {
    concurrency: job.concurrency,
    mode: 'either', // 'either' ensures all tasks are attempted
  })

  // compute success rate
  const successes = Array.filterMap(results, Option.getRight)
  yield* Effect.logDebug(
    `Processed ${successes.length} of ${sources.length} targets`
  )

  // fail if below threshold
  const successRate = successes.length / sources.length
  if (successRate < job.successThreshold) {
    yield* Effect.fail(
      new Error(
        `Success rate ${successRate} is below threshold ${job.successThreshold}`
      )
    )
  }
})
