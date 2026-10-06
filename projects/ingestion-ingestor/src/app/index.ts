import { Array, Cause, Clock, Context, Data, Effect, Option } from 'effect'

import {
  IngestionJobCompletedKey,
  IngestionJobCompletedSchema,
} from '@fact-check-database/ingestion-contracts/logging/v1'

import { ingestFromSource } from './ingestFromSource'
import { ResolvedSource, SourceList } from './SourceList'

export interface JobContext {
  runId: string
  concurrency: number
  startedAt: number
  successThreshold: number
}

export const JobContext = Context.GenericTag<JobContext>('JobContext')

/** The run's share of successfully ingested sources fell below `successThreshold`. */
export class SuccessThresholdNotMet extends Data.TaggedError(
  'SuccessThresholdNotMet'
)<{
  readonly successRate: number
  readonly successThreshold: number
}> {}

function processTarget(source: ResolvedSource, index: number) {
  return Effect.gen(function* () {
    yield* Effect.annotateLogsScoped({
      'source.index': index,
      'source.id': source.id,
      'source.name': source.name,
      'source.url': source.url,
      'source.collection': source.collection,
    })
    const job = yield* JobContext
    const timestamp = yield* Clock.currentTimeMillis

    yield* ingestFromSource({
      ingestorRunId: job.runId,
      timestamp,
      source,
      timeoutSeconds: source.timeoutSeconds,
    }).pipe(
      Effect.tapErrorCause((cause) =>
        Effect.logError('Source ingestion failed', cause).pipe(
          Effect.annotateLogs({
            'error._tag': Option.match(Cause.failureOption(cause), {
              onNone: () => 'Defect',
              onSome: (error) => error._tag,
            }),
          })
        )
      )
    )
  }).pipe(Effect.scoped, Effect.withSpan('processTarget'))
}

export const App = Effect.gen(function* () {
  const ctx = yield* JobContext
  const { sources } = yield* SourceList

  // process all targets with configured concurrency
  const tasks = Array.map(sources, processTarget)
  const results = yield* Effect.all(tasks, {
    concurrency: ctx.concurrency,
    mode: 'either', // 'either' ensures all tasks are attempted
  })

  // compute success rate
  const successes = Array.filterMap(results, Option.getRight)
  const successRate = successes.length / sources.length
  const result = successRate >= ctx.successThreshold ? 'success' : 'failure'

  // The event fields feed the ingestion dashboards, which count one line per
  // event, so they are attached to this line only rather than scoped
  const completed =
    result === 'success'
      ? Effect.logInfo('Ingestor job completed')
      : Effect.logError('Ingestor job completed')
  yield* completed.pipe(
    Effect.annotateLogs(
      IngestionJobCompletedSchema.make({
        event: IngestionJobCompletedKey,
        'job.successRate': successRate,
        'job.tasks': tasks.length,
        'job.successes': successes.length,
        'job.failures': tasks.length - successes.length,
        'job.result': result,
      })
    )
  )

  // fail if below threshold
  if (result === 'failure') {
    return yield* new SuccessThresholdNotMet({
      successRate,
      successThreshold: ctx.successThreshold,
    })
  }
})
