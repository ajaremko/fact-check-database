import { Clock, Config, Effect, Logger, Queue } from 'effect'

import { Node } from '@news-research/node'
import { IngestionAttempted, IngestorRecord } from '@news-research/contracts'

import { Archiver } from './ports/Archiver'
import { MessageQueue } from './ports/MessageQueue'
import { SanitizerPolicyDocument } from './ports/SanitizerPolicyDocument'
import type { SanitizerPolicy } from './data/SanitizerPolicy'

import { evaluatePolicy } from './integration'

const readConfig = Effect.gen(function* () {
  const logLevel = yield* Config.logLevel('LOG_LEVEL')
  return { logLevel }
})

export function processTarget(
  policy: SanitizerPolicy,
  event: IngestionAttempted,
  record: IngestorRecord.DataFetchedRecord
) {
  return Effect.gen(function* () {
    const archiver = yield* Archiver

    const decision = evaluatePolicy(policy, record)
    const sanitizationId = yield* Node.generateUUID()
    const sanitizedAt = yield* Clock.currentTimeMillis

    yield* archiver.writeSanitizerRecord(
      {
        version: 1,
        kind: 'sanitized_record',
        url: record.url,
        http: record.http,
        runId: record.runId,
        source: record.source,
        content: record.content,
        sanitizationId,
        fetchedAt: record.fetchedAt,
        sanitizedAt,
        policy: {
          label: decision.label,
          actions: decision.actions,
        },
        input: {
          record: event.pointer,
          raw: record.outcome === 'data_fetched' ? event.pointer : undefined,
        },
      },
      {
        sourceCollection: record.source.collection,
        sourceName: record.source.name,
        sanitizedAt,
        fetchedAt: record.fetchedAt,
        url: record.url,
        id: sanitizationId,
      }
    )
  }).pipe(
    Effect.tapError(Effect.logError),
    Effect.annotateLogs({ runId: record.runId })
  )
}

export const processTargets = Effect.gen(function* () {
  const policyDocument = yield* SanitizerPolicyDocument
  const { messages, errors } = yield* MessageQueue
  const archiver = yield* Archiver

  const policy = yield* policyDocument.read

  const handleMessages = Queue.take(messages).pipe(
    Effect.andThen((message) =>
      Effect.gen(function* () {
        const event = yield* message.read
        const record = yield* archiver.readFetchAttemptRecord(event.pointer)

        if (record.outcome === 'data_fetched') {
          yield* Effect.logInfo(`Processing observation ${event.observationId}`)
          yield* processTarget(policy, event, record)
        } else {
          yield* Effect.logInfo(`Skipping observation ${event.observationId}`)
        }
      }).pipe(
        Effect.andThen(() => message.ack),
        Effect.catchTag('ParseError', () => message.ack),
        Effect.catchAll(() => message.nack)
      )
    ),
    Effect.forever
  )

  const handleErrors = Queue.take(errors).pipe(
    Effect.tap((error) =>
      Effect.logError(`Message queue error: ${error.cause}`)
    ),
    Effect.andThen(Effect.fail)
  )

  yield* Effect.logInfo('Listening for messages...')

  yield* Effect.all([handleMessages, handleErrors], {
    concurrency: 'unbounded',
  })
})

export const Program = Effect.gen(function* () {
  const { logLevel } = yield* readConfig

  yield* processTargets.pipe(Effect.provide(Logger.minimumLogLevel(logLevel)))
})
