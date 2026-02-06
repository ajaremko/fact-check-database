import { Array, Clock, Config, Effect, Either, Logger, Schema } from 'effect'

import { Archiver } from './ports/Archive'
import { Fetcher } from './ports/Fetcher'
import { Publisher } from './ports/Publisher'
import { TargetList } from './ports/TargetList'
import { SourceTarget } from './domain/SourceTarget'
import { createObservationFetched } from './domain/createObservationFetched'
import { isResponse } from './domain/FetchResult'

const readConfig = Effect.gen(function* () {
  const startedAt = yield* Clock.currentTimeMillis

  const runId = yield* Config.string('RUN_ID').pipe(
    Config.withDefault(String(startedAt))
  )

  const concurrency = yield* Schema.Config(
    'MAX_CONCURRENCY',
    Schema.NumberFromString.pipe(Schema.nonNegative(), Schema.int())
  ).pipe(Config.withDefault(10))

  const successThreshold = yield* Schema.Config(
    'SUCCESS_THRESHOLD',
    Schema.NumberFromString.pipe(Schema.clamp(0, 1))
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

        const pointer = yield* archive.archive({
          runId,
          sourceName: source.name,
          url: source.url,
          fetchedAt,
          result,
        })

        if (isResponse(result)) {
          const event = createObservationFetched({
            runId,
            url: source.url,
            sourceName: source.name,
            sourceCollection: source.collection,
            fetchedAt,
            status: result.status,
            headers: result.headers,
            body: result.body,
            archive: pointer,
            error: result.error ?? undefined,
          })

          yield* publisher.publish(event)
        }
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
