import { Array, Clock, Context, Effect, Option, pipe, Schema } from 'effect'

import * as Node from '@news-research/core-data/Node'
import { publish } from '@news-research/core-io'

import { SourceList, Source } from '../ports/SourceList'
import { ingestFromSource } from './ingestFromSource'

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
    yield* Effect.logDebug(`Requesting content from source ${index + 1}`)
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

export const App = Effect.gen(function* () {
  const ctx = yield* JobContext
  const { sources } = yield* SourceList

  // process all targets with configured concurrency
  yield* Effect.logDebug(`Processing ${sources.length} targets`)
  const tasks = Array.map(sources, processTarget)
  const results = yield* Effect.all(tasks, {
    concurrency: ctx.concurrency,
    mode: 'either', // 'either' ensures all tasks are attempted
  })

  // compute success rate
  const successes = Array.filterMap(results, Option.getRight)
  yield* Effect.logDebug(
    `Processed ${successes.length} of ${sources.length} targets`
  )

  const successRate = successes.length / sources.length
  const result = successRate >= ctx.successThreshold ? 'success' : 'failure'

  yield* Effect.logInfo(`Ingestor job run ${ctx.runId} completed`).pipe(
    Effect.annotateLogs({
      event: 'ingestor_job_completed',
      'job.successRate': successRate,
      'job.tasks': tasks.length,
      'job.successes': successes.length,
      'job.failures': tasks.length - successes.length,
      'job.result': result,
    })
  )

  // fail if below threshold
  if (result === 'failure') {
    yield* Effect.fail(
      new Error(
        `Success rate ${successRate} is below threshold ${ctx.successThreshold}`
      )
    )
  }
})
