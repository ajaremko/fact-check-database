import { Config, Effect, Layer, Logger } from 'effect'
import { NodeFileSystem, NodeRuntime } from '@effect/platform-node'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeSdk } from '@effect/opentelemetry'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'

import * as BigQueryClient from '@news-research/ingestion-vendor/bigquery/BigQueryClient'
import * as GcpLoggingPinoConfig from '@news-research/ingestion-vendor/pino-logging-gcp-config'
import {
  HttpServerMessageQueueFeeder,
  InMemoryMessageQueue,
} from '@news-research/ingestion-messaging'
import { StorageClient } from '@news-research/ingestion-vendor/cloud-storage'
import { cloudRunInstanceId } from '@news-research/ingestion-vendor/cloud-run'
import { pinoLogger } from '@news-research/ingestion-vendor/pino'

import { Program } from './Program'

const OtelServiceNameConfig = Config.string('OTEL_SERVICE_NAME')

const otel = Layer.unwrapEffect(
  Effect.gen(function* () {
    const serviceName = yield* Config.withDefault(
      OtelServiceNameConfig,
      'extractor'
    )

    const instanceId = yield* cloudRunInstanceId

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

const main = Effect.all(
  [
    Program,
    Layer.launch(
      HttpServerMessageQueueFeeder.layer('/extractor-topic-messages')
    ),
  ],
  { concurrency: 2 }
).pipe(
  Effect.provide(StorageClient.layer()),
  Effect.provide(BigQueryClient.layer()),
  Effect.provide(InMemoryMessageQueue.layer),
  Effect.provide(NodeFileSystem.layer),
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
