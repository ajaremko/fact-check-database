import { Config, Context, Effect, Layer, Logger, Stream } from 'effect'
import { NodeRuntime } from '@effect/platform-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeSdk } from '@effect/opentelemetry'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'

import {
  StorageBucket,
  StorageClient,
} from '@news-research/ingestion-vendor/cloud-storage'
import {
  PubsubClient,
  PubsubTopic,
} from '@news-research/ingestion-vendor/cloud-pubsub'
import { GcpLoggingPinoConfig } from '@news-research/ingestion-vendor/pino-logging-gcp-config'
import { cloudRunInstanceId } from '@news-research/ingestion-vendor/cloud-run'
import { pinoLogger } from '@news-research/ingestion-vendor/pino'

const readJobContext = Effect.gen(function* () {
  const source = yield* Config.string('GCS_SOURCE_PATH')
  const destination = yield* Config.withDefault(
    Config.string('GCS_DESTINATION_PATH'),
    null
  )
  const bucketName = yield* Config.string('GCS_BUCKET_NAME')
  const topicName = yield* Config.string('PUBSUB_TOPIC_NAME')
  return { source, destination, bucketName, topicName }
})

type JobContextShape = Effect.Effect.Success<typeof readJobContext>

class JobContext extends Context.Tag('JobContext')<
  JobContext,
  JobContextShape
>() {}

function processFile(file: StorageBucket.File) {
  return Effect.gen(function* () {
    yield* Effect.logInfo(`Publishing data from file: ${file.name}`)
    const [data] = yield* StorageBucket.downloadFile(file.name)
    yield* PubsubTopic.publishMessage({ data })

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

const otel = cloudRunInstanceId.pipe(
  Effect.map((instanceId) =>
    NodeSdk.layer(() => ({
      resource: {
        serviceName: 'loader',
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
  ),
  Layer.unwrapEffect
)

const main = Program.pipe(
  Effect.provide(StorageBucket.layer(Config.string('GCS_BUCKET_NAME'))),
  Effect.provide(StorageClient.layer()),
  Effect.provide(PubsubTopic.layer(Config.string('PUBSUB_TOPIC_NAME'))),
  Effect.provide(PubsubClient.layer()),
  Effect.provideServiceEffect(JobContext, readJobContext),
  Effect.provide(
    Logger.addScoped(
      GcpLoggingPinoConfig.make.pipe(
        Effect.andThen((config) => pinoLogger(config))
      )
    )
  ),
  Effect.provide(Logger.remove(Logger.defaultLogger)),
  Effect.provide(otel)
)

NodeRuntime.runMain(main, { disablePrettyLogger: true })
