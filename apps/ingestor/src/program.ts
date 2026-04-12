import { Array, Effect, Either, Logger } from 'effect'

import {
  ingestFromSourceTarget,
  SourceTarget,
} from '@news-research/ingestion/ingest'

import { JobContext } from './JobContext'
import { Publisher } from './Publisher'
import { TargetList } from './TargetList'

function processTarget(target: SourceTarget, index: number) {
  return Effect.gen(function* () {
    const { runId } = yield* JobContext
    const publisher = yield* Publisher

    // ingest from target and publish event
    yield* Effect.logInfo(`Processing target ${index + 1}`)
    const event = yield* ingestFromSourceTarget(runId, target, index)
    yield* publisher.publish(event)
  }).pipe(
    Effect.tapError(Effect.logError),
    Effect.annotateLogs({
      source: target.name,
      url: target.url,
      collection: target.collection,
    })
  )
}

const processTargetList = Effect.gen(function* () {
  const job = yield* JobContext
  const { sources } = yield* TargetList

  // process all targets with configured concurrency
  yield* Effect.logInfo(`Processing ${sources.length} targets`)
  const tasks = Array.map(sources, processTarget)
  const results = yield* Effect.all(tasks, {
    concurrency: job.concurrency,
    mode: 'either', // 'either' ensures all tasks are attempted
  })

  // check success rate and fail if below threshold
  const [successes] = Array.partition(results, Either.isLeft)
  const successRate = successes.length / sources.length
  yield* Effect.logInfo(
    `Processed ${successes.length} of ${sources.length} targets`
  )
  if (successRate < job.successThreshold) {
    yield* Effect.fail(
      new Error(
        `Success rate ${successRate} is below threshold ${job.successThreshold}`
      )
    )
  }
})

export const Program = Effect.gen(function* () {
  const { runId, concurrency, startedAt, logLevel } = yield* JobContext

  yield* processTargetList.pipe(
    Effect.tapError(Effect.logError),
    Effect.annotateLogs({ runId, startedAt, concurrency }),
    Effect.provide(Logger.minimumLogLevel(logLevel))
  )
})
