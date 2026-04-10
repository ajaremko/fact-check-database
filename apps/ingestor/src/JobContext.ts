import { Context, Clock, Config, Effect, Layer, Schema } from 'effect'

import { Node } from '@news-research/node'

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

  const logLevel = yield* Config.logLevel('LOG_LEVEL')

  return { runId, concurrency, startedAt, successThreshold, logLevel }
})

type JobContextShape = Effect.Effect.Success<typeof make>

export class JobContext extends Context.Tag('JobContext')<
  JobContext,
  JobContextShape
>() {}

export const layer = Layer.effect(JobContext, make)
