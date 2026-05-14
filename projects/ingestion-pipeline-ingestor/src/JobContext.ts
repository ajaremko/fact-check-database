import { Context, Clock, Config, Effect, Layer, Schema } from 'effect'

import * as Node from '@news-research/ingestion-data/Node'

const MaxConcurrencySchema = Schema.NumberFromString.pipe(
  Schema.nonNegative(),
  Schema.int()
)

const SuccessThresholdSchema = Schema.NumberFromString.pipe(Schema.clamp(0, 1))

const make = Effect.gen(function* () {
  const startedAt = yield* Clock.currentTimeMillis
  const runId = yield* Node.generateUUID()

  const concurrency = yield* Schema.Config(
    'MAX_CONCURRENCY',
    MaxConcurrencySchema
  ).pipe(Config.withDefault(10))

  const successThreshold = yield* Schema.Config(
    'SUCCESS_THRESHOLD',
    SuccessThresholdSchema
  ).pipe(Config.withDefault(0.8))

  return { runId, concurrency, startedAt, successThreshold }
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
