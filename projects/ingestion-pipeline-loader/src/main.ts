import { Config, Effect, Logger, Layer, LogLevel } from 'effect'
import { NodeRuntime } from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { TraceExporter as CloudTraceTraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'
import { MetricExporter as CloudMonitoringMetricExporter } from '@google-cloud/opentelemetry-cloud-monitoring-exporter'
import { GcpDetectorSync } from '@google-cloud/opentelemetry-resource-util'

import * as HttpServerMessageQueueFeeder from '@news-research/ingestion-messaging/adapters/HttpServerMessageQueueFeeder'
import * as InMemoryMessageQueue from '@news-research/ingestion-messaging/adapters/InMemoryMessageQueue'
import * as BigQueryClient from '@news-research/ingestion-vendor/bigquery/BigQueryClient'
import * as GcpLoggingPinoConfig from '@news-research/ingestion-vendor/pino-logging-gcp-config'
import { cloudRunInstanceId } from '@news-research/ingestion-vendor/cloud-run'
import { pinoLogger } from '@news-research/ingestion-vendor/pino'

import { Program } from './Program'

const LoggingLevelConfig = Config.logLevel('LOGGING_LEVEL')

function withMinimumLogLevel<A, E, R>(self: Effect.Effect<A, E, R>) {
  return Config.withDefault(LoggingLevelConfig, LogLevel.Info).pipe(
    Effect.andThen((level) => Logger.withMinimumLogLevel(self, level))
  )
}

const gcpLogger = GcpLoggingPinoConfig.make.pipe(
  Effect.andThen((config) => pinoLogger(config))
)

const logger = Layer.empty.pipe(
  Layer.merge(Logger.addScoped(gcpLogger)),
  Layer.merge(Logger.remove(Logger.defaultLogger))
)

const OtelServiceNameConfig = Config.string('OTEL_SERVICE_NAME').pipe(
  Config.orElse(() => Config.string('SERVICE_NAME'))
)
const OtelExportIntervalConfig = Config.integer('OTEL_METRIC_EXPORT_INTERVAL')
const OtelCloudMonitoringPrefixConfig = Config.string(
  'OTEL_CLOUD_MONITORING_PREFIX'
)

const otel = Layer.unwrapEffect(
  Effect.gen(function* () {
    const serviceName = yield* OtelServiceNameConfig
    const exportIntervalMillis = yield* Config.withDefault(
      OtelExportIntervalConfig,
      1 * 60 * 1000
    )

    const prefix = yield* Config.withDefault(
      OtelCloudMonitoringPrefixConfig,
      'workload.googleapis.com'
    )

    const resource = new GcpDetectorSync().detect()
    const instanceId = yield* cloudRunInstanceId

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

function withMessageQueueFeeder<A, E, R>(self: Effect.Effect<A, E, R>) {
  return Effect.gen(function* () {
    yield* Effect.logDebug('Using http server message queue feeder')
    const server = HttpServerMessageQueueFeeder.layer(
      '/extractor-topic-messages'
    )
    return yield* Effect.all([self, Layer.launch(server)], {
      concurrency: 'unbounded',
    })
  })
}

withMessageQueueFeeder(Program).pipe(
  Effect.provide(BigQueryClient.layer()),
  Effect.provide(InMemoryMessageQueue.layer),
  Effect.provide(otel),
  Effect.provide(logger),
  withMinimumLogLevel,
  NodeRuntime.runMain({ disablePrettyLogger: true })
)
