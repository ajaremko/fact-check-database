import { Array, Clock, Config, Effect, Either, Logger, Schema } from 'effect'

import { Node } from '@news-research/node'

import {
  createDataFetchedRecord,
  createNoResponseRecord,
  createMetadata,
} from './integration/createAttemptRecord'
import { Archiver } from './ports/Archiver'
import { Fetcher } from './ports/Fetcher'
import { Publisher } from './ports/Publisher'
import { TargetList } from './ports/TargetList'
import { SourceTarget } from './data/SourceTarget'
import { FetchAttempt } from './data/FetchAttempt'
import { createObservationFetched } from './integration/createObservationFetched'

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

function processTarget(runId: string, source: SourceTarget, index: number) {
  return Effect.gen(function* () {
    yield* Effect.logInfo(`Processing target ${index + 1}`)

    const archive = yield* Archiver
    const fetcher = yield* Fetcher
    const publisher = yield* Publisher
    const fetchedAt = yield* Clock.currentTimeMillis

    const result = yield* fetcher.fetch(source.url)
    const attempt: FetchAttempt = {
      runId,
      fetchedAt,
      source,
      result,
    }

    if (Either.isLeft(result)) {
      // In case of fetch failure, archive the attempt
      // record without archiving response body
      const record = createNoResponseRecord({
        runId,
        fetchedAt,
        source,
        result: result.left,
      })
      const meta = createMetadata(attempt.runId, attempt)
      const recordPointer = yield* archive.archiveRecord(attempt, record, meta)
      const event = yield* createObservationFetched(attempt, recordPointer)
      yield* publisher.publish(event)
    } else {
      // If fetch is successful, archive both the response
      // body and the attempt record
      const bodyPointer = yield* archive.archiveBody(
        attempt,
        result.right.body,
        result.right.contentType
      )
      const record = createDataFetchedRecord({
        runId,
        fetchedAt,
        source,
        result: result.right,
        pointer: bodyPointer,
      })
      const meta = createMetadata(attempt.runId, attempt)
      const recordPointer = yield* archive.archiveRecord(attempt, record, meta)
      const event = yield* createObservationFetched(attempt, recordPointer)
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

function processTargets(
  runId: string,
  concurrency: number,
  successThreshold: number,
  startedAt: number
) {
  return Effect.gen(function* () {
    const targetList = yield* TargetList

    const targets = yield* targetList.read

    yield* Effect.logInfo(`Processing ${targets.length} targets`)

    const tasks = targets.map((target, index) =>
      processTarget(runId, target, index)
    )

    // 'either' mode ensures that all tasks are attempted,
    // even if some fail
    const results = yield* Effect.all(tasks, { concurrency, mode: 'either' })

    const [successes] = Array.partition(results, Either.isLeft)

    yield* Effect.logInfo(
      `Processed ${successes.length} of ${targets.length} targets`
    )

    const successRate = successes.length / targets.length

    if (successRate < successThreshold) {
      const cause = new Error(
        `Success rate ${successRate} is below threshold ${successThreshold}`
      )
      yield* Effect.fail(cause)
    }
  }).pipe(
    Effect.tapError(Effect.logError),
    Effect.annotateLogs({ runId, startedAt, concurrency })
  )
}

export const Program = Effect.gen(function* () {
  const { runId, concurrency, startedAt, successThreshold, logLevel } =
    yield* readConfig

  yield* processTargets(runId, concurrency, successThreshold, startedAt).pipe(
    Effect.provide(Logger.minimumLogLevel(logLevel))
  )
})
