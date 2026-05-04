import { Config, Effect, Layer, Logger, Schema, pipe } from 'effect'
import { NodeFileSystem, NodeRuntime } from '@effect/platform-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeSdk } from '@effect/opentelemetry'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'

import {
  HttpServerMessageQueueFeeder,
  InMemoryMessageQueue,
} from '@news-research/ingestion-core/messaging'
import { BigQueryClient } from '@news-research/ingestion-core/vendor/bigquery'
import { ExtractionBatchReadySchema } from '@news-research/ingestion-core/pipeline/extract/contracts/v1'
import { GcpLoggingPinoConfig } from '@news-research/ingestion-core/vendor/pino-logging-gcp-config'
import { StorageClient } from '@news-research/ingestion-core/vendor/cloud-storage'
import { MessageQueue } from '@news-research/ingestion-core/messaging'
import { Node } from '@news-research/ingestion-core/data'
import { cloudRunInstanceId } from '@news-research/ingestion-core/vendor/cloud-run'
import { loadBatch } from '@news-research/ingestion-core/pipeline/load'
import { pinoLogger } from '@news-research/ingestion-core/vendor/pino'

const decodeIncoming = pipe(
  ExtractionBatchReadySchema,
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.decode
)

function processMessage(message: MessageQueue.Message) {
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
    Effect.tapError(Effect.logError),
    Effect.withSpan('processMessage'),
    Effect.catchTags({
      ParseError: () => message.ack,
      BigQueryClientIOError: () => message.nack,
    })
  )
}

const Program = Effect.gen(function* () {
  const { messages, errors } = yield* MessageQueue.MessageQueue

  const handleMessages = messages.take.pipe(
    Effect.andThen(processMessage),
    Effect.forever
  )

  const handleErrors = errors.take.pipe(
    Effect.tap(Effect.logError),
    Effect.andThen(Effect.fail)
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

const logger = Logger.replaceScoped(
  Logger.defaultLogger,
  GcpLoggingPinoConfig.make.pipe(Effect.andThen((config) => pinoLogger(config)))
)

const main = Program.pipe(
  Effect.provide(
    HttpServerMessageQueueFeeder.layer('/sanitizer-topic-messages')
  ),
  Effect.provide(StorageClient.layer()),
  Effect.provide(BigQueryClient.layer()),
  Effect.provide(InMemoryMessageQueue.layer),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(logger),
  Effect.provide(otel)
)

NodeRuntime.runMain(main)
