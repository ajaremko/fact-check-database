import { Clock, Config, Effect, Schema } from 'effect'
import { HttpClient } from '@effect/platform'

import { Archiver } from './ports/Archive'
import { Fetcher } from './ports/Fetcher'
import { Publisher } from './ports/Publisher'
import { TargetList } from './ports/TargetList'
import { SourceTarget } from './domain/SourceTarget'

const Concurrency = Schema.Config(
  'CONCURRENCY',
  Schema.NumberFromString.pipe(Schema.nonNegative(), Schema.int())
).pipe(Config.withDefault(10))

export const Program = Effect.gen(function* () {
  const { targets } = yield* TargetList
  const fetcher = yield* Fetcher
  const archive = yield* Archiver
  const publisher = yield* Publisher

  function processTarget(target: SourceTarget) {
    return Effect.gen(function* () {
      const fetchedAt = yield* Clock.currentTimeMillis
      const observation = yield* fetcher.fetch(target)

      const pointer = yield* archive.archive({
        runId: cfg.runId === 'auto' ? `${Date.now()}` : cfg.runId,
        sourceName: cfg.sourceName,
        url: target.url,
        fetchedAt,
        status,
        headers,
        body,
      })

      yield* publisher.publish({})
    })
  }

  const tasks = targets.map(processTarget)

  const concurrency = yield* Concurrency

  yield* Effect.all(tasks, { concurrency })
})
