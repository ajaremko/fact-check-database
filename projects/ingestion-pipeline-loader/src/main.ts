import { Config, Effect, Layer, Logger, Schema, pipe } from 'effect'
import { NodeFileSystem, NodeRuntime } from '@effect/platform-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeSdk } from '@effect/opentelemetry'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'

import {
  HttpServerMessageQueueFeeder,
  InMemoryMessageQueue,
  QueueMessage,
  takeError,
  takeMessage,
} from '@news-research/ingestion-messaging'
import { BigQueryClient } from '@news-research/ingestion-vendor/bigquery'
import { ExtractionBatchReadySchema } from '@news-research/ingestion-pipeline/extract/contracts/v1'
import { GcpLoggingPinoConfig } from '@news-research/ingestion-vendor/pino-logging-gcp-config'
import { StorageClient } from '@news-research/ingestion-vendor/cloud-storage'
import { Node } from '@news-research/ingestion-data'
import { cloudRunInstanceId } from '@news-research/ingestion-vendor/cloud-run'
import { loadBatch } from '@news-research/ingestion-pipeline/load'
import { pinoLogger } from '@news-research/ingestion-vendor/pino'

const decodeIncoming = pipe(
  ExtractionBatchReadySchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

function processMessage(message: QueueMessage) {
  return Effect.gen(function* () {
    const projectId = yield* Config.string('GOOGLE_CLOUD_PROJECT')
    const incoming = yield* decodeIncoming(message.data)
    yield* loadBatch({
      projectId,
      pointer: incoming.pointer,
      sourceFormat: incoming.source_format,
      table: {
        dataset: incoming.table.dataset_id,
        table: incoming.table.table_id,
      },
      schema: incoming.schema,
    })
    yield* message.ack
  }).pipe(
    Effect.tapErrorCause(Effect.logError),
    Effect.withSpan('processMessage'),
    Effect.catchTags({
      ParseError: () => message.ack,
      BigQueryClientIOError: () => message.nack,
    })
  )
}

const Program = Effect.gen(function* () {
  const handleMessages = takeMessage.pipe(
    Effect.andThen(processMessage),
    Effect.tapErrorCause(Effect.logError),
    Effect.forever
  )

  const handleErrors = takeError.pipe(
    Effect.andThen(Effect.fail),
    Effect.tapErrorCause(Effect.logError)
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
        serviceName: 'loader',
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

const main = Effect.all(
  [
    Program,
    Layer.launch(
      HttpServerMessageQueueFeeder.layer('/extractor-topic-messages')
    ),
  ],
  { concurrency: 2 }
).pipe(
  Effect.provide(StorageClient.layer()),
  Effect.provide(BigQueryClient.layer()),
  Effect.provide(InMemoryMessageQueue.layer),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(
    Logger.addScoped(
      GcpLoggingPinoConfig.make.pipe(
        Effect.andThen((config) => pinoLogger(config))
      )
    )
  ),
  Effect.provide(Logger.remove(Logger.defaultLogger)),
  Effect.provide(otel)
)

NodeRuntime.runMain(main, { disablePrettyLogger: true })
