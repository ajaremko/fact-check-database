import {
  Cause,
  Clock,
  Config,
  Data,
  Effect,
  Layer,
  Logger,
  LogLevel,
  Option,
  Schema,
} from 'effect'
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

import * as CloudPubsubPublisher from '@fact-check-database/core-io/adapters/CloudPubsubPublisher'
import * as FileSystemPublisher from '@fact-check-database/core-io/adapters/FileSystemPublisher'
import * as PubsubClient from '@fact-check-database/core-vendor/cloud-pubsub/PubsubClient'
import * as GcpLoggingPinoConfig from '@fact-check-database/core-vendor/pino-logging-gcp-config'
import * as StorageClient from '@fact-check-database/core-vendor/cloud-storage/StorageClient'
import * as Node from '@fact-check-database/core-data/Node'
import * as CloudStorageStorageWriter from '@fact-check-database/core-io/adapters/CloudStorageStorageWriter'
import * as FileSystemStorageWriterWithNotification from '@fact-check-database/core-io/adapters/FileSystemStorageWriterWithNotification'
import { cloudRunInstanceId } from '@fact-check-database/core-vendor/cloud-run'
import { pinoLogger } from '@fact-check-database/core-vendor/pino'

import * as CloudStorageSourceList from './adapters/CloudStorageSourceList'
import * as FileSystemSourceList from './adapters/FileSystemSourceList'
import * as HttpClientFetcher from './adapters/HttpClientFetcher'
import { App, JobContext } from './app'

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
      yield* Effect.logInfo('Source list mode selected').pipe(
        Effect.annotateLogs({ 'mode.sourceList': sourceListMode })
      )
      return Layer.empty.pipe(
        Layer.merge(FileSystemSourceList.layer),
        Layer.provide(NodeFileSystem.layer)
      )
    }
    yield* Effect.logInfo('Source list mode selected').pipe(
      Effect.annotateLogs({ 'mode.sourceList': sourceListMode })
    )
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
      yield* Effect.logInfo('Storage mode selected').pipe(
        Effect.annotateLogs({ 'mode.storage': storageMode })
      )
      return Layer.empty.pipe(
        Layer.merge(FileSystemStorageWriterWithNotification.layer('records')),
        Layer.provide(NodeFileSystem.layer)
      )
    }
    yield* Effect.logInfo('Storage mode selected').pipe(
      Effect.annotateLogs({ 'mode.storage': storageMode })
    )
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
      yield* Effect.logInfo('Messaging mode selected').pipe(
        Effect.annotateLogs({ 'mode.messaging': messagingMode })
      )
      return Layer.empty.pipe(
        Layer.merge(FileSystemPublisher.layer),
        Layer.provide(NodeFileSystem.layer)
      )
    }
    yield* Effect.logInfo('Messaging mode selected').pipe(
      Effect.annotateLogs({ 'mode.messaging': messagingMode })
    )
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
const OtelExportIntervalConfig = Config.integer('OTEL_METRIC_EXPORT_INTERVAL')
const OtelShutdownTimeoutConfig = Config.integer('OTEL_SHUTDOWN_TIMEOUT')
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
    const shutdownTimeout = yield* Config.withDefault(
      OtelShutdownTimeoutConfig,
      15 * 1000
    )

    if (otelMode === 'local') {
      yield* Effect.logInfo('Telemetry mode selected').pipe(
        Effect.annotateLogs({ 'mode.otel': otelMode })
      )
      return NodeSdk.layer(() => ({
        resource: { serviceName },
        spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
        metricReader: new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter(),
          exportIntervalMillis,
        }),
        shutdownTimeout,
      }))
    }

    const prefix = yield* Config.withDefault(
      OtelCloudMonitoringPrefixConfig,
      'workload.googleapis.com'
    )
    const resource = new GcpDetectorSync().detect()
    const instanceId = yield* cloudRunInstanceId

    yield* Effect.logInfo('Telemetry mode selected').pipe(
      Effect.annotateLogs({ 'mode.otel': otelMode })
    )
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
      shutdownTimeout,
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

/**
 * Runs the job with its run-level annotations on every log line, including
 * the lines logged while the layers above are built.
 */
function withJobAnnotations<A, E, R>(self: Effect.Effect<A, E, R>) {
  return Effect.gen(function* () {
    const ctx = yield* JobContext
    yield* Effect.annotateLogsScoped({
      'job.runId': ctx.runId,
      'job.concurrency': ctx.concurrency,
      'job.startedAt': ctx.startedAt,
      'job.successThreshold': ctx.successThreshold,
    })
    yield* Effect.logInfo('Ingestor job started')
    return yield* self.pipe(Effect.withSpan('jobRun'))
  }).pipe(Effect.scoped)
}

/** Marks a failure that has already been logged as fatal. */
class IngestorStopped extends Data.TaggedError('IngestorStopped') {}

App.pipe(
  Effect.provide(fetcher),
  Effect.provide(sourceList),
  Effect.provide(storage),
  Effect.provide(messaging),
  Effect.provide(otel),
  withJobAnnotations,
  Effect.provide(job),
  // Logged here, while the configured logger is still installed
  Effect.tapErrorCause((cause) =>
    Effect.logFatal('Ingestor job stopped', cause)
  ),
  Effect.catchAllCause(() => Effect.fail(new IngestorStopped())),
  Effect.provide(logger),
  // Only a failure to build the logger itself reaches this point unlogged,
  // so it falls back to the default logger
  Effect.tapErrorCause((cause) =>
    Cause.failureOption(cause).pipe(
      Option.exists((error) => error instanceof IngestorStopped)
    )
      ? Effect.void
      : Effect.logFatal('Ingestor failed to start', cause)
  ),
  withMinimumLogLevel,
  // every failure is logged above, so the runtime's own report is disabled
  NodeRuntime.runMain({
    disablePrettyLogger: true,
    disableErrorReporting: true,
  })
)
