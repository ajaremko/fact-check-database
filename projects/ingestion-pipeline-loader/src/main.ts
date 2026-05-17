import { Config, Effect, Logger, Layer, LogLevel } from 'effect'
import { NodeRuntime } from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'

import * as HttpServerMessageQueueFeeder from '@news-research/ingestion-messaging/adapters/HttpServerMessageQueueFeeder'
import * as InMemoryMessageQueue from '@news-research/ingestion-messaging/adapters/InMemoryMessageQueue'
import * as BigQueryClient from '@news-research/ingestion-vendor/bigquery/BigQueryClient'
import * as GcpLoggingPinoConfig from '@news-research/ingestion-vendor/pino-logging-gcp-config'
import { cloudRunInstanceId } from '@news-research/ingestion-vendor/cloud-run'
import { pinoLogger } from '@news-research/ingestion-vendor/pino'

import { Program } from './Program'

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
