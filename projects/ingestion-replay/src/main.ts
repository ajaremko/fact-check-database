import {
  Clock,
  Config,
  Context,
  Effect,
  Layer,
  Logger,
  LogLevel,
  Stream,
} from 'effect'
import { NodeRuntime } from '@effect/platform-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { NodeSdk } from '@effect/opentelemetry'
import { TraceExporter as CloudTraceTraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'
import { MetricExporter as CloudMonitoringMetricExporter } from '@google-cloud/opentelemetry-cloud-monitoring-exporter'
import { GcpDetectorSync } from '@google-cloud/opentelemetry-resource-util'

import * as StorageBucket from '@news-research/core-vendor/cloud-storage/StorageBucket'
import * as StorageClient from '@news-research/core-vendor/cloud-storage/StorageClient'
import * as PubsubClient from '@news-research/core-vendor/cloud-pubsub/PubsubClient'
import * as PubsubTopic from '@news-research/core-vendor/cloud-pubsub/PubsubTopic'
import * as GcpLoggingPinoConfig from '@news-research/core-vendor/pino-logging-gcp-config'
import * as Node from '@news-research/ingestion-data/Node'
import { cloudRunInstanceId } from '@news-research/core-vendor/cloud-run'
import { pinoLogger } from '@news-research/core-vendor/pino'

interface JobContext {
  runId: string
  startedAt: number
  source: string
  destination: string | null
  bucketName: string
  topicName: string
}

const JobContext = Context.GenericTag<JobContext>('JobContext')

function processFile(file: StorageBucket.File) {
  return Effect.gen(function* () {
    yield* Effect.logInfo(`Publishing data from file: ${file.name}`)
    const [data] = yield* StorageBucket.downloadFile(file.name)
    yield* PubsubTopic.publishMessage({ data })
    console.log(`----- ${file.name} -----`)
    console.log(data.toString())

    const ctx = yield* JobContext
    if (ctx.destination) {
      const destination = ctx.destination.endsWith('/')
        ? `${ctx.destination}${file.name}`
        : `${ctx.destination}/${file.name}`
      yield* StorageBucket.moveFile(file.name, destination)
      yield* Effect.logInfo(`Moved file ${file.name} to ${destination}`)
    }
  }).pipe(
    Effect.tapErrorCause(Effect.logError),
    Effect.withSpan('processMessage')
  )
}

const Program = Effect.gen(function* () {
  const ctx = yield* JobContext
  yield* Effect.logInfo(
    `Starting GCS Data Transfer of files matching gs://${ctx.bucketName}/${ctx.source} to ${ctx.topicName}`
  )

  const files = yield* StorageBucket.getFilesStream({
    matchGlob: ctx.source,
  })

  if (ctx.destination) {
    yield* Effect.logWarning(
      `Destination provided. Files will be moved to gs://${ctx.bucketName}/${ctx.destination} after processing`
    )
  }

  yield* files.pipe(Stream.mapEffect(processFile), Stream.runDrain)
})

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

const otel = Layer.unwrapEffect(
  Effect.gen(function* () {
    const serviceName = yield* OtelServiceNameConfig

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
        exporter: new CloudMonitoringMetricExporter(),
        exportIntervalMillis: 1 * 60 * 1000,
      }),
    }))
  })
)

const LoggingLevelConfig = Config.logLevel('LOGGING_LEVEL')

function withMinimumLogLevel<A, E, R>(self: Effect.Effect<A, E, R>) {
  return Config.withDefault(LoggingLevelConfig, LogLevel.Info).pipe(
    Effect.andThen((level) => Logger.withMinimumLogLevel(self, level))
  )
}

const job = Layer.effect(
  JobContext,
  Effect.gen(function* () {
    const startedAt = yield* Clock.currentTimeMillis
    const runId = yield* Node.generateUUID()
    const source = yield* Config.string('GCS_SOURCE_PATH')
    const destination = yield* Config.withDefault(
      Config.string('GCS_DESTINATION_PATH'),
      null
    )
    const bucketName = yield* Config.string('GCS_BUCKET_NAME')
    const topicName = yield* Config.string('PUBSUB_TOPIC_NAME')
    return { runId, startedAt, source, destination, bucketName, topicName }
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
        'job.startedAt': ctx.startedAt,
        'job.source': ctx.source,
        'job.destination': ctx.destination ?? 'none',
        'job.bucketName': ctx.bucketName,
        'job.topicName': ctx.topicName,
      })
    )
  })
}

Program.pipe(
  Effect.provide(StorageBucket.layer(Config.string('GCS_BUCKET_NAME'))),
  Effect.provide(StorageClient.layer()),
  Effect.provide(PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME'))),
  Effect.provide(PubsubClient.layer()),
  Effect.provide(otel),
  withJobAnnotations,
  Effect.provide(logger),
  Effect.provide(job),
  withMinimumLogLevel,
  NodeRuntime.runMain({ disablePrettyLogger: true })
)
