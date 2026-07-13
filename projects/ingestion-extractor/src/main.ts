import { Config, Effect, Logger, Layer, Schema, Clock, LogLevel } from 'effect'
import { NodeRuntime, NodeFileSystem } from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { TraceExporter as CloudTraceTraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'
import { MetricExporter as CloudMonitoringMetricExporter } from '@google-cloud/opentelemetry-cloud-monitoring-exporter'
import { GcpDetectorSync } from '@google-cloud/opentelemetry-resource-util'

import * as CloudPubsubMessageBatch from '@news-research/core-io/adapters/CloudPubsubMessageBatch'
// import * as CloudPubsubPublisher from '@news-research/core-io/adapters/CloudPubsubPublisher'
// import * as FileSystemPublisher from '@news-research/core-io/adapters/FileSystemPublisher'
import * as FileSystemMessageBatch from '@news-research/core-io/adapters/FileSystemMessageBatch'
import * as PubsubSubscriberClient from '@news-research/core-vendor/cloud-pubsub/PubsubSubscriberClient'
// import * as PubsubClient from '@news-research/core-vendor/cloud-pubsub/PubsubClient'
import * as GcpLoggingPinoConfig from '@news-research/core-vendor/pino-logging-gcp-config'
import * as StorageClient from '@news-research/core-vendor/cloud-storage/StorageClient'
import * as Node from '@news-research/core-data/Node'
import * as CloudStorageStorageWriter from '@news-research/core-io/adapters/CloudStorageStorageWriter'
import * as CloudStorageStorageReader from '@news-research/core-io/adapters/CloudStorageStorageReader'
import * as FileSystemStorageWriter from '@news-research/core-io/adapters/FileSystemStorageWriter'
import * as FileSystemStorageReader from '@news-research/core-io/adapters/FileSystemStorageReader'
import { cloudRunInstanceId } from '@news-research/core-vendor/cloud-run'
import { pinoLogger } from '@news-research/core-vendor/pino'

import { App, JobContext } from './app'

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
        // Layer.merge(FileSystemPublisher.layer),
        Layer.provide(NodeFileSystem.layer)
      )
    }
    return Layer.empty.pipe(
      Layer.merge(CloudPubsubMessageBatch.layer),
      // Layer.merge(CloudPubsubPublisher.layer),
      Layer.provide(PubsubSubscriberClient.layer())
      // Layer.provide(PubsubClient.layer())
    )
  }).pipe(
    // necessary to merge layer error types correctly
    Effect.map(Layer.mergeAll)
  )
)

const LoggingModeConfig = Config.literal('gcp', 'console')('LOGGING_MODE')
const LoggingLevelConfig = Config.logLevel('LOGGING_LEVEL')

function withMinimumLogLevel<A, E, R>(self: Effect.Effect<A, E, R>) {
  return Config.withDefault(LoggingLevelConfig, LogLevel.Info).pipe(
    Effect.andThen((level) => Logger.withMinimumLogLevel(self, level))
  )
}

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
const OtelServiceNameConfig = Config.string('OTEL_SERVICE_NAME').pipe(
  Config.orElse(() => Config.string('SERVICE_NAME'))
)
const OtelExportIntervalConfig = Config.integer('OTEL_METRIC_EXPORT_INTERVAL')
const OtelCloudMonitoringPrefixConfig = Config.string(
  'OTEL_CLOUD_MONITORING_PREFIX'
)

const otel = Layer.unwrapEffect(
  Effect.gen(function* () {
    const otelMode = yield* Config.withDefault(OtelModeConfig, 'gcp')
    const serviceName = yield* OtelServiceNameConfig
    const exportIntervalMillis = yield* Config.withDefault(
      OtelExportIntervalConfig,
      1 * 60 * 1000
    )

    if (otelMode === 'local') {
      yield* Effect.logDebug('Using local otel configuration')
      return NodeSdk.layer(() => ({
        resource: { serviceName },
        spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
        metricReader: new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter(),
          exportIntervalMillis,
        }),
      }))
    }

    const prefix = yield* Config.withDefault(
      OtelCloudMonitoringPrefixConfig,
      'workload.googleapis.com'
    )

    const resource = new GcpDetectorSync().detect()
    const instanceId = yield* cloudRunInstanceId

    yield* Effect.logDebug('Using gcp otel configuration')
    return NodeSdk.layer(() => ({
      resource: {
        ...resource,
        serviceName,
        attributes: {
          ...resource.attributes,
          'service.instance.id': instanceId,
        },
      },
      spanProcessor: new BatchSpanProcessor(
        new CloudTraceTraceExporter({
          resourceFilter: /^service\./,
        })
      ),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new CloudMonitoringMetricExporter({
          prefix,
        }),
        exportIntervalMillis,
      }),
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
    return { runId, concurrency, startedAt }
  })
)

function withJobAnnotations<A, E, R>(self: Effect.Effect<A, E, R>) {
  return Effect.gen(function* () {
    const ctx = yield* JobContext
    yield* Effect.logInfo(`Starting extractor job run ${ctx.runId}`)
    return yield* self.pipe(
      Effect.withSpan('jobRun'),
      Effect.annotateLogs({
        'job.runId': ctx.runId,
        'job.concurrency': ctx.concurrency,
        'job.startedAt': ctx.startedAt,
      })
    )
  })
}

App.pipe(
  Effect.provide(storage),
  Effect.provide(messaging),
  Effect.provide(otel),
  withJobAnnotations,
  Effect.provide(job),
  Effect.provide(logger),
  withMinimumLogLevel,
  NodeRuntime.runMain({ disablePrettyLogger: true })
)
