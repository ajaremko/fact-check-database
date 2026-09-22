import { Config, Effect, Logger, Layer, LogLevel } from 'effect'
import { NodeRuntime, NodeFileSystem } from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { TraceExporter as CloudTraceTraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'
import { MetricExporter as CloudMonitoringMetricExporter } from '@google-cloud/opentelemetry-cloud-monitoring-exporter'
import { GcpDetectorSync } from '@google-cloud/opentelemetry-resource-util'

import * as HttpServerMessageQueueFeeder from '@fact-check-database/core-io/adapters/HttpServerMessageQueueFeeder'
import * as FilesystemMessageQueueFeeder from '@fact-check-database/core-io/adapters/FileSystemMessageQueueFeeder'
import * as InMemoryMessageQueue from '@fact-check-database/core-io/adapters/InMemoryMessageQueue'
import * as CloudPubsubPublisher from '@fact-check-database/core-io/adapters/CloudPubsubPublisher'
import * as FileSystemPublisher from '@fact-check-database/core-io/adapters/FileSystemPublisher'
import * as PubsubClient from '@fact-check-database/core-vendor/cloud-pubsub/PubsubClient'
import * as GcpLoggingPinoConfig from '@fact-check-database/core-vendor/pino-logging-gcp-config'
import * as StorageClient from '@fact-check-database/core-vendor/cloud-storage/StorageClient'
import * as CloudStorageStorageWriter from '@fact-check-database/core-io/adapters/CloudStorageStorageWriter'
import * as CloudStorageStorageReader from '@fact-check-database/core-io/adapters/CloudStorageStorageReader'
import * as FileSystemStorageWriterWithNotification from '@fact-check-database/core-io/adapters/FileSystemStorageWriterWithNotification'
import * as FileSystemStorageReader from '@fact-check-database/core-io/adapters/FileSystemStorageReader'
import { cloudRunInstanceId } from '@fact-check-database/core-vendor/cloud-run'
import { pinoLogger } from '@fact-check-database/core-vendor/pino'

import * as CloudStorageSanitizerPolicyDocument from './adapters/CloudStorageSanitizerPolicyDocument'
import * as FileSystemSanitizerPolicyDocument from './adapters/FileSystemSanitizerPolicyDocument'
import { App } from './app'

const SanitizerPolicyModeConfig = Config.literal(
  'gcp',
  'filesystem'
)('SANITIZER_POLICY_MODE')

const sanitizerPolicy = Layer.unwrapEffect(
  Effect.gen(function* () {
    const sanitizerPolicyMode = yield* Config.withDefault(
      SanitizerPolicyModeConfig,
      'gcp'
    )

    if (sanitizerPolicyMode === 'filesystem') {
      yield* Effect.logDebug('Using filesystem sanitizer policy document')
      return Layer.empty.pipe(
        Layer.merge(FileSystemSanitizerPolicyDocument.layer),
        Layer.provide(NodeFileSystem.layer)
      )
    }

    yield* Effect.logDebug('Using gcs sanitizer policy document')
    return Layer.empty.pipe(
      Layer.merge(CloudStorageSanitizerPolicyDocument.layer),
      Layer.provide(StorageClient.layer())
    )
  }).pipe(
    // necessary to merge layer error types correctly
    Effect.map(Layer.mergeAll)
  )
)

const StorageModeConfig = Config.literal('gcp', 'filesystem')('STORAGE_MODE')

const storage = Layer.unwrapEffect(
  Effect.gen(function* () {
    const storageMode = yield* Config.withDefault(StorageModeConfig, 'gcp')
    if (storageMode === 'filesystem') {
      yield* Effect.logDebug('Using filesystem storage')
      return Layer.empty.pipe(
        Layer.merge(FileSystemStorageWriterWithNotification.layer('records')),
        Layer.merge(FileSystemStorageReader.layer),
        Layer.provide(NodeFileSystem.layer)
      )
    }
    yield* Effect.logDebug('Using gcs storage')
    return Layer.empty.pipe(
      Layer.merge(CloudStorageStorageWriter.layer),
      Layer.merge(CloudStorageStorageReader.layer),
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

function withMessageQueueFeeder<A, E, R>(self: Effect.Effect<A, E, R>) {
  return Effect.gen(function* () {
    yield* Effect.logInfo('Starting message queue feeder')
    const messagingMode = yield* Config.withDefault(MessagingModeConfig, 'gcp')
    if (messagingMode === 'filesystem') {
      yield* Effect.logInfo('Using filesystem message queue feeder')
      const layer = Layer.empty.pipe(
        Layer.merge(FilesystemMessageQueueFeeder.layer),
        Layer.provide(NodeFileSystem.layer)
      )
      return yield* Effect.all([self, Layer.launch(layer)], {
        concurrency: 'unbounded',
      })
    }
    yield* Effect.logInfo('Using http server message queue feeder')
    const server = HttpServerMessageQueueFeeder.layer(
      '/ingestor-topic-messages'
    )
    return yield* Effect.all([self, Layer.launch(server)], {
      concurrency: 'unbounded',
    })
  })
}

withMessageQueueFeeder(App).pipe(
  Effect.provide(sanitizerPolicy),
  Effect.provide(storage),
  Effect.provide(messaging),
  Effect.provide(otel),
  Effect.provide(logger),
  Effect.provide(InMemoryMessageQueue.layer),
  withMinimumLogLevel,
  NodeRuntime.runMain({ disablePrettyLogger: true })
)
