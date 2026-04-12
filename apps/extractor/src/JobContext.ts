import { Context, Clock, Config, Effect, Layer, Schema } from 'effect'

import { Node } from '@news-research/ingestion/util'

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

  const logLevel = yield* Config.logLevel('LOG_LEVEL')

  return { runId, concurrency, startedAt, logLevel }
})

type JobContextShape = Effect.Effect.Success<typeof make>

export class JobContext extends Context.Tag('JobContext')<
  JobContext,
  JobContextShape
>() {}

export const layer = Layer.effect(JobContext, make)
