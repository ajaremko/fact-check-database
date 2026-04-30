import { Context, Clock, Config, Effect, Layer, Schema } from 'effect'

import { Node } from '@news-research/ingestion/data'

const MaxConcurrencySchema = Schema.NumberFromString.pipe(
  Schema.nonNegative(),
  Schema.int()
)

const make = Effect.gen(function* () {
  const startedAt = yield* Clock.currentTimeMillis
  const runId = yield* Node.generateUUID()

  const concurrency = yield* Schema.Config(
    'MAX_CONCURRENCY',
    MaxConcurrencySchema
  ).pipe(Config.withDefault(10))

  const datasetId = yield* Schema.Config('BIGQUERY_DATASET', Schema.String)

  return { runId, concurrency, startedAt, datasetId }
})

type JobContextShape = Effect.Effect.Success<typeof make>

export class JobContext extends Context.Tag('JobContext')<
  JobContext,
  JobContextShape
>() {}

export const layer = Layer.effect(JobContext, make)

export function withJobContextAnnotations<A, E, R>(
  effect: Effect.Effect<R, E, A>
) {
  return JobContext.pipe(
    Effect.andThen(({ runId, startedAt, concurrency }) =>
      Effect.withSpan(
        Effect.annotateLogs(effect, { runId, startedAt, concurrency }),
        'jobRun'
      )
    )
  )
}
