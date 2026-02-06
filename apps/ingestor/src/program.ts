import { Clock, Config, Effect, Schema } from 'effect'

import { Archiver } from './ports/Archive'
import { Fetcher } from './ports/Fetcher'
import { Publisher } from './ports/Publisher'
import { TargetList } from './ports/TargetList'
import { SourceTarget } from './domain/SourceTarget'
import { createObservationFetched } from './domain/createObservationFetched'
import { isResponse } from './domain/FetchResult'

const Concurrency = Schema.Config(
  'MAX_CONCURRENCY',
  Schema.NumberFromString.pipe(Schema.nonNegative(), Schema.int())
).pipe(Config.withDefault(10))

export const Program = Effect.gen(function* () {
  const startedAt = yield* Clock.currentTimeMillis

  const RunId = Config.string('RUN_ID').pipe(
    Config.withDefault(String(startedAt))
  )

  const targetList = yield* TargetList
  const archive = yield* Archiver
  const fetcher = yield* Fetcher
  const publisher = yield* Publisher

  const concurrency = yield* Concurrency
  const runId = yield* RunId
  const targets = yield* targetList.read

  function processTarget(source: SourceTarget) {
    return Effect.gen(function* () {
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
    })
  }

  const tasks = targets.map(processTarget)

  // 'either' mode ensures that all tasks are attempted,
  // even if some fail
  yield* Effect.all(tasks, { concurrency, mode: 'either' })
})
