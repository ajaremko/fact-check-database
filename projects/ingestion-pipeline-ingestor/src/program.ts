import { Array, Clock, Effect, Option, pipe, Schema } from 'effect'

import { Node } from '@news-research/ingestion-data'
import { ingestFromSource } from '@news-research/ingestion-pipeline/ingest'
import { publish } from '@news-research/ingestion-messaging'

import { JobContext, withJobContextAnnotations } from './JobContext'
import { SourceList, Source } from './TargetList'

const encodeOutgoing = pipe(
  Schema.Object,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

function processTarget(source: Source, index: number) {
  return Effect.gen(function* () {
    const job = yield* JobContext
    const timestamp = yield* Clock.currentTimeMillis

    // ingest from target and publish event
    yield* Effect.logInfo(`Processing target ${index + 1}: ${source.name}`)
    const event = yield* ingestFromSource({
      ingestionId: job.runId,
      timestamp,
      source,
    })

    const data = yield* encodeOutgoing(event)
    yield* publish(data)
  }).pipe(
    Effect.tapErrorCause(Effect.logError),
    Effect.annotateLogs({
      source: source.name,
      url: source.url,
      collection: source.collection,
    }),
    Effect.withSpan('processTarget')
  )
}

export const Program = withJobContextAnnotations(
  Effect.gen(function* () {
    const job = yield* JobContext
    const { sources } = yield* SourceList

    // process all targets with configured concurrency
    yield* Effect.logInfo(`Processing ${sources.length} targets`)
    const tasks = Array.map(sources, processTarget)
    const results = yield* Effect.all(tasks, {
      concurrency: job.concurrency,
      mode: 'either', // 'either' ensures all tasks are attempted
    })

    // compute success rate
    const successes = Array.filterMap(results, Option.getRight)
    yield* Effect.logInfo(
      `Processed ${successes.length} of ${sources.length} targets`
    )

    // fail if below threshold
    const successRate = successes.length / sources.length
    if (successRate < job.successThreshold) {
      yield* Effect.fail(
        new Error(
          `Success rate ${successRate} is below threshold ${job.successThreshold}`
        )
      )
    }
  })
)
