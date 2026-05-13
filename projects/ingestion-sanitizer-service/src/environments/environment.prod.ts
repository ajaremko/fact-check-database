import { Effect, Layer, Logger } from 'effect'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeSdk } from '@effect/opentelemetry'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'

import {
  CloudStorageStorageReader,
  CloudStorageStorageWriter,
} from '@news-research/ingestion-pipeline/shared'
import {
  CloudPubsubPublisher,
  HttpServerMessageQueueFeeder,
  InMemoryMessageQueue,
} from '@news-research/ingestion-messaging'
import { StorageClient } from '@news-research/ingestion-vendor/cloud-storage'
import { PubsubClient } from '@news-research/ingestion-vendor/cloud-pubsub'
import { GcpLoggingPinoConfig } from '@news-research/ingestion-vendor/pino-logging-gcp-config'
import { cloudRunInstanceId } from '@news-research/ingestion-vendor/cloud-run'
import { pinoLogger } from '@news-research/ingestion-vendor/pino'

import * as CloudStorageSanitizerPolicyDocument from '../adapters/cloud-storage/SanitizerPolicyDocument'
import { Program } from '../program'

const otel = cloudRunInstanceId.pipe(
  Effect.map((instanceId) =>
    NodeSdk.layer(() => ({
      resource: {
        serviceName: 'sanitizer',
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

export const main = Effect.all(
  [
    Program,
    Layer.launch(
      HttpServerMessageQueueFeeder.layer('/ingestor-topic-messages')
    ),
  ],
  { concurrency: 2 }
).pipe(
  Effect.provide(CloudPubsubPublisher.layer),
  Effect.provide(CloudStorageSanitizerPolicyDocument.layer),
  Effect.provide(CloudStorageStorageReader.layer),
  Effect.provide(CloudStorageStorageWriter.layer),
  Effect.provide(StorageClient.layer()),
  Effect.provide(PubsubClient.layer()),
  Effect.provide(InMemoryMessageQueue.layer),
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
