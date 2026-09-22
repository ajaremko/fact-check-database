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

import * as CloudStorageStorageReader from '@fact-check-database/core-io/adapters/CloudStorageStorageReader'
import * as FileSystemStorageReader from '@fact-check-database/core-io/adapters/FileSystemStorageReader'
import * as GcpLoggingPinoConfig from '@fact-check-database/core-vendor/pino-logging-gcp-config'
import * as StorageClient from '@fact-check-database/core-vendor/cloud-storage/StorageClient'
import { cloudRunInstanceId } from '@fact-check-database/core-vendor/cloud-run'
import { pinoLogger } from '@fact-check-database/core-vendor/pino'

import * as LoggerEmailer from './adapters/LoggerEmailer'
import * as ResendEmailer from './adapters/ResendEmailer'
import { App } from './app'

const EmailerModeConfig = Config.literal('resend', 'logger')('EMAILER_MODE')

const emailer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const emailerMode = yield* Config.withDefault(EmailerModeConfig, 'resend')

    if (emailerMode === 'logger') {
      yield* Effect.logDebug('Using logger emailer')
      return Layer.empty.pipe(Layer.merge(LoggerEmailer.layer))
    }

    yield* Effect.logDebug('Using resend emailer')
    return Layer.empty.pipe(Layer.merge(ResendEmailer.layer))
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
        Layer.merge(FileSystemStorageReader.layer),
        Layer.provide(NodeFileSystem.layer)
      )
    }
    yield* Effect.logDebug('Using gcs storage')
    return Layer.empty.pipe(
      Layer.merge(CloudStorageStorageReader.layer),
      Layer.provide(StorageClient.layer())
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

App.pipe(
  Effect.provide(emailer),
  Effect.provide(storage),
  Effect.provide(otel),
  Effect.provide(logger),
  withMinimumLogLevel,
  NodeRuntime.runMain({ disablePrettyLogger: true })
)
