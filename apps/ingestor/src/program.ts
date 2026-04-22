import { Array, Effect, Option, pipe, Schema } from 'effect'

import {
  StorageWriter,
  ingestFromSource,
  SourceTarget,
  ObservationIngested,
  Fetcher,
} from '@news-research/ingestion/steps/ingest'
import { Publisher } from '@news-research/ingestion/messaging'
import { Node } from '@news-research/ingestion/util'

import { JobContext, withJobContextAnnotations } from './JobContext'
import { SourceList } from './TargetList'

const encodeOutgoing = pipe(
  ObservationIngested,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

function processTarget(target: SourceTarget, index: number) {
  return Effect.gen(function* () {
    const job = yield* JobContext

    // ingest from target and publish event
    yield* Effect.logInfo('Processing target')
    const event = yield* ingestFromSource({
      ingestionId: job.runId,
      source: target,
      index,
    })

    const data = yield* encodeOutgoing(event)

    yield* Publisher.publish(data)
  })
    .pipe(
      Effect.tapError(Effect.logError),
      Effect.annotateLogs({
        source: target.name,
        url: target.url,
        collection: target.collection,
        index,
      })
    )
    .pipe(Effect.withSpan('processTarget'))
}

export type Program = Effect.Effect<
  void,
  Error,
  | JobContext
  | SourceList
  | Publisher.Publisher
  | StorageWriter.StorageWriter
  | Fetcher.Fetcher
>

export const Program: Program = withJobContextAnnotations(
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
    const successRate = successes.length / sources.length
    yield* Effect.logInfo(
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
