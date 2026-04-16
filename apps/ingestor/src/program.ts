import { Array, Effect, Option } from 'effect'

import {
  ingestFromSourceTarget,
  SourceTarget,
} from '@news-research/ingestion/ingest'

import { JobContext, withJobContextAnnotations } from './JobContext'
import { Publisher } from './Publisher'
import { TargetList } from './TargetList'

function processTarget(target: SourceTarget, index: number) {
  return Effect.gen(function* () {
    const job = yield* JobContext
    const publisher = yield* Publisher

    // ingest from target and publish event
    yield* Effect.logDebug('Processing target')
    const event = yield* ingestFromSourceTarget({
      runId: job.runId,
      source: target,
      index,
    })

    yield* publisher.publish(event)
  }).pipe(
    Effect.tapError(Effect.logError),
    Effect.annotateLogs({
      source: target.name,
      url: target.url,
      collection: target.collection,
      index,
    })
  )
}

export const Program = withJobContextAnnotations(
  Effect.gen(function* () {
    const job = yield* JobContext
    const { sources } = yield* TargetList

    // process all targets with configured concurrency
    yield* Effect.logDebug(`Processing ${sources.length} targets`)
    const tasks = Array.map(sources, processTarget)
    const results = yield* Effect.all(tasks, {
      concurrency: job.concurrency,
      mode: 'either', // 'either' ensures all tasks are attempted
    })

    // compute success rate
    const successes = Array.filterMap(results, Option.getRight)
    const successRate = successes.length / sources.length
    yield* Effect.logDebug(
      `Processed ${successes.length} of ${sources.length} targets`
    )

    // fail if below threshold
    if (successRate < job.successThreshold) {
      yield* Effect.fail(
        new Error(
          `Success rate ${successRate} is below threshold ${job.successThreshold}`
        )
      )
    }
  })
)
