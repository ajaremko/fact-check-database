import { Config, Effect, Logger, Layer, Schema, Clock, LogLevel } from 'effect'
import {
  NodeRuntime,
  NodeFileSystem,
  NodeHttpClient,
} from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { TraceExporter as CloudTraceTraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'
import { MetricExporter as CloudMonitoringMetricExporter } from '@google-cloud/opentelemetry-cloud-monitoring-exporter'
import { GcpDetectorSync } from '@google-cloud/opentelemetry-resource-util'

import * as HttpClientFetcher from '@news-research/ingestion-pipeline/ingest/adapters/HttpClientFetcher'
import * as CloudPubsubPublisher from '@news-research/ingestion-messaging/adapters/CloudPubsubPublisher'
import * as FileSystemPublisher from '@news-research/ingestion-messaging/adapters/FileSystemPublisher'
import * as PubsubClient from '@news-research/ingestion-vendor/cloud-pubsub/PubsubClient'
import * as GcpLoggingPinoConfig from '@news-research/ingestion-vendor/pino-logging-gcp-config'
import * as StorageClient from '@news-research/ingestion-vendor/cloud-storage/StorageClient'
import * as Node from '@news-research/ingestion-data/Node'
import * as CloudStorageStorageWriter from '@news-research/ingestion-pipeline/shared/adapters/CloudStorageStorageWriter'
import * as FileSystemStorageWriter from '@news-research/ingestion-pipeline/shared/adapters/FileSystemStorageWriter'
import { cloudRunInstanceId } from '@news-research/ingestion-vendor/cloud-run'
import { pinoLogger } from '@news-research/ingestion-vendor/pino'

import * as CloudStorageSourceList from './CloudStorageSourceList'
import * as FileSystemSourceList from './FileSystemSourceList'
import { Program, JobContext } from './Program'

const fetcher = Layer.empty.pipe(
  Layer.merge(HttpClientFetcher.layer),
  Layer.provide(NodeHttpClient.layer)
)

const SourceListModeConfig = Config.literal(
  'gcp',
  'filesystem'
)('SOURCE_LIST_MODE')

const sourceList = Layer.unwrapEffect(
  Effect.gen(function* () {
    const sourceListMode = yield* Config.withDefault(
      SourceListModeConfig,
      'gcp'
    )
    if (sourceListMode === 'filesystem') {
      yield* Effect.logDebug('Using filesystem source list')
      return Layer.empty.pipe(
        Layer.merge(FileSystemSourceList.layer),
        Layer.provide(NodeFileSystem.layer)
      )
    }
    yield* Effect.logDebug('Using gcs source list')
    return Layer.empty.pipe(
      Layer.merge(CloudStorageSourceList.layer),
      Layer.provide(StorageClient.layer())
    )
  }).pipe(Effect.map(Layer.mergeAll)) // necessary to merge layer error types correctly
)

const StorageModeConfig = Config.literal('gcp', 'filesystem')('STORAGE_MODE')

const storage = Layer.unwrapEffect(
  Effect.gen(function* () {
    const storageMode = yield* Config.withDefault(StorageModeConfig, 'gcp')
    if (storageMode === 'filesystem') {
      yield* Effect.logDebug('Using filesystem storage')
      return Layer.empty.pipe(
        Layer.merge(FileSystemStorageWriter.layer),
        Layer.provide(NodeFileSystem.layer)
      )
    }
    yield* Effect.logDebug('Using gcs storage')
    return Layer.empty.pipe(
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
        Layer.merge(FileSystemPublisher.layer),
        Layer.provide(NodeFileSystem.layer)
      )
    }
    yield* Effect.logDebug('Using gcp messaging')
    return Layer.empty.pipe(
      Layer.merge(CloudPubsubPublisher.layer),
      Layer.provide(PubsubClient.layer())
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

const otel = Layer.unwrapEffect(
  Effect.gen(function* () {
    const otelMode = yield* Config.withDefault(OtelModeConfig, 'gcp')
    const serviceName = yield* OtelServiceNameConfig

    if (otelMode === 'local') {
      yield* Effect.logDebug('Using local otel configuration')
      return NodeSdk.layer(() => ({
        resource: { serviceName },
        spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
        metricReader: new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter(),
          exportIntervalMillis: 5000,
        }),
      }))
    }

    const resource = new GcpDetectorSync().detect()
    const instanceId = yield* cloudRunInstanceId
    console.log('Detected otel resource:', resource)
    console.log('Detected cloud run instance ID:', instanceId)

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
        exporter: new CloudMonitoringMetricExporter(),
        exportIntervalMillis: 10000,
      }),
    }))
  })
)

const MaxConcurrencyConfig = Schema.Config(
  'MAX_CONCURRENCY',
  Schema.NumberFromString.pipe(Schema.nonNegative(), Schema.int())
)

const SuccessThresholdConfig = Schema.Config(
  'SUCCESS_THRESHOLD',
  Schema.NumberFromString.pipe(Schema.clamp(0, 1))
)

const job = Layer.effect(
  JobContext,
  Effect.gen(function* () {
    const startedAt = yield* Clock.currentTimeMillis
    const runId = yield* Node.generateUUID()
    const concurrency = yield* Config.withDefault(MaxConcurrencyConfig, 10)
    const successThreshold = yield* Config.withDefault(
      SuccessThresholdConfig,
      0.8
    )
    return { runId, concurrency, startedAt, successThreshold }
  })
)

function withJobAnnotations<A, E, R>(self: Effect.Effect<A, E, R>) {
  return Effect.gen(function* () {
    const ctx = yield* JobContext
    yield* Effect.logInfo(`Starting job with runId: ${ctx.runId}`)
    return yield* self.pipe(
      Effect.withSpan('jobRun'),
      Effect.annotateLogs({
        'job.runId': ctx.runId,
        'job.concurrency': ctx.concurrency,
        'job.startedAt': ctx.startedAt,
        'job.successThreshold': ctx.successThreshold,
      })
    )
  })
}

Program.pipe(
  Effect.provide(fetcher),
  Effect.provide(sourceList),
  Effect.provide(storage),
  Effect.provide(messaging),
  Effect.provide(otel),
  withJobAnnotations,
  Effect.provide(logger),
  Effect.provide(job),
  withMinimumLogLevel,
  NodeRuntime.runMain({ disablePrettyLogger: true })
)
