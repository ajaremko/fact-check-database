import { Config, Effect, Layer, Logger, Stream } from 'effect'
import { NodeRuntime } from '@effect/platform-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeSdk } from '@effect/opentelemetry'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'

import {
  StorageBucket,
  StorageClient,
} from '@news-research/ingestion-core/vendor/cloud-storage'
import { GcpLoggingPinoConfig } from '@news-research/ingestion-core/vendor/pino-logging-gcp-config'
import { cloudRunInstanceId } from '@news-research/ingestion-core/vendor/cloud-run'
import { pinoLogger } from '@news-research/ingestion-core/vendor/pino'

function processFile(file: unknown) {
  return Effect.gen(function* () {
    yield* Effect.logInfo(`Processing file: ${typeof file} ${file}`)
  }).pipe(
    Effect.tapErrorCause(Effect.logError),
    Effect.withSpan('processMessage')
  )
}

const Program = Effect.gen(function* () {
  const sourcePathPattern = yield* Config.string('GCS_SOURCE_PATH')
  const pubsubTopic = yield* Config.string('PUBSUB_TOPIC_NAME')
  yield* Effect.logInfo(
    `Starting GCS Data Transfer from ${sourcePathPattern} to ${pubsubTopic}`
  )

  const files = yield* StorageBucket.getFilesStream({
    matchGlob: sourcePathPattern,
  })

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
