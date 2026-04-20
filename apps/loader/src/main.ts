import { Effect, Layer, Logger, Schema, pipe } from 'effect'
import { NodeFileSystem, NodeRuntime } from '@effect/platform-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeSdk } from '@effect/opentelemetry'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'

import { StorageClient, StorageBucketCache } from '@news-research/cloud-storage'
import { BigQueryClient } from '@news-research/bigquery'
import { ExtractionBatchReady } from '@news-research/ingestion/steps/extract'
import { GcpLoggingPinoConfig } from '@news-research/pino-logging-gcp-config'
import { InMemoryMessageQueue } from '@news-research/ingestion/adapters'
import { MessageQueue } from '@news-research/ingestion/messaging'
import { Node } from '@news-research/ingestion/util'
import { cloudRunInstanceId } from '@news-research/cloud-run'
import { loadJsonFromGcs } from '@news-research/ingestion/steps/load'
import { pinoLogger } from '@news-research/pino'

import * as HttpServerMessageQueueFeeder from './MessageQueueFeeder'

const decodeIncoming = pipe(
  ExtractionBatchReady,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

function processMessage(message: MessageQueue.Message) {
  return Effect.gen(function* () {
    const incoming = yield* decodeIncoming(message.data)
    yield* loadJsonFromGcs({
      pointer: incoming.pointer,
      meta: incoming.meta,
      table: incoming.table,
    })
    yield* message.ack
  }).pipe(
    Effect.tapError(Effect.logError),
    Effect.withSpan('processMessage'),
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

const otel = cloudRunInstanceId.pipe(
  Effect.map((instanceId) =>
    NodeSdk.layer(() => ({
      resource: {
        serviceName: 'ingestor',
        attributes: {
          'service.instance.id': instanceId,
        },
      },
      spanProcessor: new BatchSpanProcessor(
        new TraceExporter({
          resourceFilter: /^service\./,
        })
      ),
    }))
  ),
  Layer.unwrapEffect
)
const logger = Logger.replaceScoped(
  Logger.defaultLogger,
  GcpLoggingPinoConfig.make.pipe(Effect.andThen((config) => pinoLogger(config)))
)

const main = Program.pipe(
  Effect.provide(HttpServerMessageQueueFeeder.layer),
  Effect.provide(StorageBucketCache.layer()),
  Effect.provide(StorageClient.layer()),
  Effect.provide(BigQueryClient.layer()),
  Effect.provide(InMemoryMessageQueue.layer),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(logger),
  Effect.provide(otel)
)

NodeRuntime.runMain(main)
