import { Config, Effect, Logger, Layer, LogLevel } from 'effect'
import { NodeRuntime } from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { TraceExporter as CloudTraceTraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'
import { MetricExporter as CloudMonitoringMetricExporter } from '@google-cloud/opentelemetry-cloud-monitoring-exporter'
import { GcpDetectorSync } from '@google-cloud/opentelemetry-resource-util'

import * as AlgoliaSearchClient from '@fact-check-database/core-vendor/algolia/AlgoliaSearchClient'
import * as CloudStorageStorageReader from '@fact-check-database/core-io/adapters/CloudStorageStorageReader'
import * as GcpLoggingPinoConfig from '@fact-check-database/core-vendor/pino-logging-gcp-config'
import * as StorageClient from '@fact-check-database/core-vendor/cloud-storage/StorageClient'
import { cloudRunInstanceId } from '@fact-check-database/core-vendor/cloud-run'
import { pinoLogger } from '@fact-check-database/core-vendor/pino'

import { Program, ServiceContext } from './Program'

const LoggingLevelConfig = Config.logLevel('LOGGING_LEVEL')

function withMinimumLogLevel<A, E, R>(self: Effect.Effect<A, E, R>) {
  return Config.withDefault(LoggingLevelConfig, LogLevel.Info).pipe(
    Effect.andThen((level) => Logger.withMinimumLogLevel(self, level))
  )
}

const storage = Layer.empty.pipe(
  Layer.merge(CloudStorageStorageReader.layer),
  Layer.provide(StorageClient.layer())
)

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

const service = Layer.effect(
  ServiceContext,
  Config.all({ indexName: Config.string('ALGOLIA_INDEX_NAME') })
)

Program.pipe(
  Effect.provide(
    AlgoliaSearchClient.layer({
      apiKey: Config.string('ALGOLIA_API_KEY'),
      appId: Config.string('ALGOLIA_APP_ID'),
      transformationOptions: Config.succeed({ region: 'us' }),
    })
  ),
  Effect.provide(storage),
  Effect.provide(otel),
  Effect.provide(logger),
  Effect.provide(service),
  withMinimumLogLevel,
  NodeRuntime.runMain({ disablePrettyLogger: true })
)
