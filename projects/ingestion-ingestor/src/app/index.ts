import { Array, Clock, Context, Effect, Option } from 'effect'

import { SourceConfig } from '@news-research/ingestion-contracts/config/v1'

import { SourceList } from '../ports/SourceList'

import { logIngestionJobCompleted } from './logging'
import { ingestFromSource } from './ingestFromSource'

export interface JobContext {
  runId: string
  concurrency: number
  startedAt: number
  successThreshold: number
}

export const JobContext = Context.GenericTag<JobContext>('JobContext')

function processTarget(source: SourceConfig, index: number) {
  return Effect.gen(function* () {
    const job = yield* JobContext
    const timestamp = yield* Clock.currentTimeMillis
    yield* Effect.logDebug(`Requesting content from source ${index + 1}`)

    yield* ingestFromSource({
      ingestionId: job.runId,
      timestamp,
      source,
    })
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

  yield* logIngestionJobCompleted({
    event: 'ingestor_job_completed',
    'job.successRate': successRate,
    'job.tasks': tasks.length,
    'job.successes': successes.length,
    'job.failures': tasks.length - successes.length,
    'job.result': result,
  })

  // fail if below threshold
  if (result === 'failure') {
    yield* Effect.fail(
      new Error(
        `Success rate ${successRate} is below threshold ${ctx.successThreshold}`
      )
    )
  }
})
