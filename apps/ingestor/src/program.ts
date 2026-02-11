import { Array, Clock, Config, Effect, Either, Logger, Schema } from 'effect'

import { Node } from '@news-research/node'

import { Archiver } from './ports/Archiver'
import { Fetcher } from './ports/Fetcher'
import { Publisher } from './ports/Publisher'
import { TargetList } from './ports/TargetList'
import { SourceTarget } from './domain/SourceTarget'
import { createObservationFetched } from './domain/createObservationFetched'
import { normalizeFetchAttempt } from './domain/normalize'

const MaxConcurrencySchema = Schema.NumberFromString.pipe(
  Schema.nonNegative(),
  Schema.int()
)
const SuccessThresholdSchema = Schema.NumberFromString.pipe(Schema.clamp(0, 1))

const readConfig = Effect.gen(function* () {
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

function processTargets(
  runId: string,
  concurrency: number,
  successThreshold: number
) {
  return Effect.gen(function* () {
    const targetList = yield* TargetList
    const archive = yield* Archiver
    const fetcher = yield* Fetcher
    const publisher = yield* Publisher

    const targets = yield* targetList.read

    yield* Effect.logInfo(`Processing ${targets.length} targets`)

    function processTarget(source: SourceTarget, index: number) {
      return Effect.gen(function* () {
        yield* Effect.logInfo(`Processing target ${index + 1}`)

        const fetchedAt = yield* Clock.currentTimeMillis

        const result = yield* fetcher.fetch(source.url)

        const attempt = normalizeFetchAttempt({
          runId,
          sourceName: source.name,
          sourceCollection: source.collection,
          url: source.url,
          finalUrl: undefined,
          fetchedAt,
          result,
        })

        const pointer = yield* archive.archive(attempt)
        const event = createObservationFetched({ attempt, archive: pointer })

        yield* publisher.publish(event)
      }).pipe(
        Effect.tapError(Effect.logError),
        Effect.annotateLogs({
          source: source.name,
          url: source.url,
          collection: source.collection,
        })
      )
    }

    const tasks = targets.map(processTarget)

    // 'either' mode ensures that all tasks are attempted,
    // even if some fail
    const results = yield* Effect.all(tasks, { concurrency, mode: 'either' })

    const [successes] = Array.partition(results, Either.isLeft)

    yield* Effect.logInfo(
      `Processed ${successes.length} of ${targets.length} targets`
    )

    const successRate = successes.length / targets.length

    if (successRate < successThreshold) {
      yield* Effect.logError(
        `Success rate ${successRate} is below threshold ${successThreshold}`
      )
      yield* Effect.fail(new Error('Success rate below threshold'))
    }
  })
}

export const Program = Effect.gen(function* () {
  const { runId, concurrency, startedAt, successThreshold, logLevel } =
    yield* readConfig
  yield* processTargets(runId, concurrency, successThreshold).pipe(
    Effect.annotateLogs({ runId, startedAt, concurrency }),
    Effect.provide(Logger.minimumLogLevel(logLevel))
  )
})
