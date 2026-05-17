import { Config, Effect, Logger, Layer, Schema, Clock } from 'effect'
import { NodeRuntime, NodeFileSystem } from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'

import * as CloudPubsubMessageBatch from '@news-research/ingestion-messaging/adapters/CloudPubsubMessageBatch'
import * as CloudPubsubPublisher from '@news-research/ingestion-messaging/adapters/CloudPubsubPublisher'
import * as FileSystemPublisher from '@news-research/ingestion-messaging/adapters/FileSystemPublisher'
import * as FileSystemMessageBatch from '@news-research/ingestion-messaging/adapters/FileSystemMessageBatch'
import * as PubsubSubscriberClient from '@news-research/ingestion-vendor/cloud-pubsub/PubsubSubscriberClient'
import * as PubsubClient from '@news-research/ingestion-vendor/cloud-pubsub/PubsubClient'
import * as GcpLoggingPinoConfig from '@news-research/ingestion-vendor/pino-logging-gcp-config'
import * as StorageClient from '@news-research/ingestion-vendor/cloud-storage/StorageClient'
import * as Node from '@news-research/ingestion-data/Node'
import * as CloudStorageStorageWriter from '@news-research/ingestion-pipeline/shared/adapters/CloudStorageStorageWriter'
import * as CloudStorageStorageReader from '@news-research/ingestion-pipeline/shared/adapters/CloudStorageStorageReader'
import * as FileSystemStorageWriter from '@news-research/ingestion-pipeline/shared/adapters/FileSystemStorageWriter'
import * as FileSystemStorageReader from '@news-research/ingestion-pipeline/shared/adapters/FileSystemStorageReader'
import { cloudRunInstanceId } from '@news-research/ingestion-vendor/cloud-run'
import { pinoLogger } from '@news-research/ingestion-vendor/pino'

import { Program, JobContext } from './program'

const StorageModeConfig = Config.literal('gcp', 'filesystem')('STORAGE_MODE')

const storage = Layer.unwrapEffect(
  Effect.gen(function* () {
    const storageMode = yield* Config.withDefault(StorageModeConfig, 'gcp')
    if (storageMode === 'filesystem') {
      yield* Effect.logDebug('Using filesystem storage')
      return Layer.empty.pipe(
        Layer.merge(FileSystemStorageReader.layer),
        Layer.merge(FileSystemStorageWriter.layer),
        Layer.provide(NodeFileSystem.layer)
      )
    }
    return Layer.empty.pipe(
      Layer.merge(CloudStorageStorageReader.layer),
      Layer.merge(CloudStorageStorageWriter.layer),
      Layer.provide(StorageClient.layer())
    )
  })
)

const MessagingModeConfig = Config.literal(
  'gcp',
  'filesystem'
)('MESSAGING_MODE')

const messaging = Layer.unwrapEffect(
  Effect.gen(function* () {
    const messagingMode = yield* Config.withDefault(MessagingModeConfig, 'gcp')
    if (messagingMode === 'filesystem') {
      yield* Effect.logDebug('Using filesystem messaging')
      return Layer.empty.pipe(
        Layer.merge(FileSystemMessageBatch.layer),
        Layer.merge(FileSystemPublisher.layer),
        Layer.provide(NodeFileSystem.layer)
      )
    }
    return Layer.empty.pipe(
      Layer.merge(CloudPubsubMessageBatch.layer),
      Layer.merge(CloudPubsubPublisher.layer),
      Layer.provide(PubsubSubscriberClient.layer()),
      Layer.provide(PubsubClient.layer())
    )
  }).pipe(
    // necessary to merge layer error types correctly
    Effect.map(Layer.mergeAll)
  )
)

const LoggingModeConfig = Config.literal('gcp', 'console')('LOGGING_MODE')

const logger = Layer.unwrapEffect(
  Effect.gen(function* () {
    const loggingMode = yield* Config.withDefault(LoggingModeConfig, 'gcp')

    if (loggingMode === 'console') {
      return Layer.empty.pipe(
        Layer.merge(Logger.add(Logger.prettyLoggerDefault)),
        Layer.merge(Logger.remove(Logger.defaultLogger))
      )
    }

    const gcpLogger = GcpLoggingPinoConfig.make.pipe(
      Effect.andThen((config) => pinoLogger(config))
    )

    return Layer.empty.pipe(
      Layer.merge(Logger.addScoped(gcpLogger)),
      Layer.merge(Logger.remove(Logger.defaultLogger))
    )
  })
)

const OtelModeConfig = Config.literal('gcp', 'local')('OTEL_MODE')
const OtelServiceNameConfig = Config.string('OTEL_SERVICE_NAME')

const otel = Layer.unwrapEffect(
  Effect.gen(function* () {
    const otelMode = yield* Config.withDefault(OtelModeConfig, 'gcp')
    const serviceName = yield* Config.withDefault(
      OtelServiceNameConfig,
      'extractor'
    )

    if (otelMode === 'local') {
      yield* Effect.logDebug('Using local OpenTelemetry configuration')
      return NodeSdk.layer(() => ({
        resource: { serviceName },
        spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
      }))
    }

    const instanceId = yield* cloudRunInstanceId

    yield* Effect.logDebug('Using gcp OpenTelemetry configuration')
    return NodeSdk.layer(() => ({
      resource: {
        serviceName,
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
  })
)

const MaxConcurrencyConfig = Schema.Config(
  'MAX_CONCURRENCY',
  Schema.NumberFromString.pipe(Schema.nonNegative(), Schema.int())
)

const job = Layer.effect(
  JobContext,
  Effect.gen(function* () {
    const startedAt = yield* Clock.currentTimeMillis
    const runId = yield* Node.generateUUID()
    const concurrency = yield* Config.withDefault(MaxConcurrencyConfig, 10)
    const datasetId = yield* Config.string('BIGQUERY_DATASET')
    return { runId, concurrency, startedAt, datasetId }
  })
)

function withJobAnnotations<A, E, R>(self: Effect.Effect<A, E, R>) {
  return Effect.gen(function* () {
    const ctx = yield* JobContext
    yield* Effect.logInfo(`Starting job with runId: ${ctx.runId}`)
    return yield* self.pipe(
      Effect.withSpan(ctx.runId),
      Effect.annotateLogs({
        'job.runId': ctx.runId,
        'job.concurrency': ctx.concurrency,
        'job.startedAt': ctx.startedAt,
        'job.datasetId': ctx.datasetId,
      })
    )
  })
}

withJobAnnotations(Program).pipe(
  Effect.provide(storage),
  Effect.provide(messaging),
  Effect.provide(logger),
  Effect.provide(otel),
  Effect.provide(job),
  NodeRuntime.runMain({ disablePrettyLogger: true })
)
