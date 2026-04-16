import { Effect } from 'effect'
import { NodeFileSystem, NodeRuntime } from '@effect/platform-node'

import { StorageClient, StorageBucketCache } from '@news-research/cloud-storage'
import { BigQueryClient } from '@news-research/bigquery'
import { loadJsonFromGcs } from '../../../packages/ingestion/dist/lib/steps/load'

import * as HttpServerMessageQueueFeeder from './MessageQueueFeeder'
import * as Logger from './Logger'
import * as MessageQueue from './MessageQueue'

function processMessage(message: MessageQueue.Message) {
  return Effect.gen(function* () {
    const incoming = yield* message.read

    yield* loadJsonFromGcs({
      pointer: incoming.pointer,
      meta: incoming.meta,
      table: incoming.table,
    })

    yield* message.ack
  }).pipe(
    Effect.tapError(Effect.logError),
    Effect.catchTags({
      ParseError: () => message.ack,
      LoadJsonFromGcsError: () => message.nack,
    })
  )
}

const Program = Effect.gen(function* () {
  const { messages, errors } = yield* MessageQueue.MessageQueue

  const handleMessages = messages.take.pipe(
    Effect.andThen(processMessage),
    Effect.annotateLogs({ handler: 'message' }),
    Effect.forever
  )

  const handleErrors = errors.take.pipe(
    Effect.tap(Effect.logError),
    Effect.andThen(Effect.fail),
    Effect.annotateLogs({ handler: 'error' })
  )

  yield* Effect.logInfo('Listening for messages...')

  yield* Effect.all([handleMessages, handleErrors], {
    concurrency: 'unbounded',
  })
})

const main = Program.pipe(
  Effect.provide(HttpServerMessageQueueFeeder.layer),
  Effect.provide(StorageBucketCache.layer()),
  Effect.provide(StorageClient.layer()),
  Effect.provide(BigQueryClient.layer()),
  Effect.provide(MessageQueue.layer),
  Effect.provide(Logger.layer),
  Effect.provide(NodeFileSystem.layer)
)

NodeRuntime.runMain(main)
