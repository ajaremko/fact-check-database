import { Config, Effect, Logger, Queue } from 'effect'
import { NodeFileSystem, NodeRuntime } from '@effect/platform-node'

import { StorageClient, StorageBucketCache } from '@news-research/cloud-storage'
import { BigQueryClient } from '@news-research/bigquery'
import { loadJsonFromGcs } from '@news-research/ingestion/load'

import * as HttpServerMessageQueueFeeder from './MessageQueueFeeder'
import * as MessageQueue from './MessageQueue'

const Program = Effect.gen(function* () {
  const { messages, errors } = yield* MessageQueue.MessageQueue
  const logLevel = yield* Config.logLevel('LOG_LEVEL')

  const handleMessages = Queue.take(messages).pipe(
    Effect.andThen((message) =>
      Effect.gen(function* () {
        const incoming = yield* message.read
        yield* loadJsonFromGcs({
          pointer: incoming.pointer,
          meta: incoming.meta,
          table: incoming.table,
        })
        yield* message.ack
      }).pipe(
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
  }).pipe(Effect.provide(Logger.minimumLogLevel(logLevel)))
})

const main = Program.pipe(
  Effect.provide(HttpServerMessageQueueFeeder.layer),
  Effect.provide(StorageBucketCache.layer()),
  Effect.provide(StorageClient.layer()),
  Effect.provide(BigQueryClient.layer()),
  Effect.provide(MessageQueue.layer),
  Effect.provide(NodeFileSystem.layer)
)

NodeRuntime.runMain(main)
