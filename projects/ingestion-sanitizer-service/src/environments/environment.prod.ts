import { Effect, Layer, Logger } from 'effect'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeSdk } from '@effect/opentelemetry'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'

import {
  CloudStorageStorageReader,
  CloudStorageStorageWriter,
} from '@news-research/ingestion-core/pipeline/shared'
import {
  CloudPubsubPublisher,
  HttpServerMessageQueueFeeder,
  InMemoryMessageQueue,
} from '@news-research/ingestion-core/messaging'
import { StorageClient } from '@news-research/ingestion-core/vendor/cloud-storage'
import { PubsubClient } from '@news-research/ingestion-core/vendor/cloud-pubsub'
import { GcpLoggingPinoConfig } from '@news-research/ingestion-core/vendor/pino-logging-gcp-config'
import { cloudRunInstanceId } from '@news-research/ingestion-core/vendor/cloud-run'
import { pinoLogger } from '@news-research/ingestion-core/vendor/pino'

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

const logger = Logger.replaceScoped(
  Logger.defaultLogger,
  GcpLoggingPinoConfig.make.pipe(Effect.andThen((config) => pinoLogger(config)))
)

export const main = Program.pipe(
  Effect.provide(
    HttpServerMessageQueueFeeder.layer('/ingestor-topic-messages')
  ),
  Effect.provide(CloudPubsubPublisher.layer),
  Effect.provide(CloudStorageSanitizerPolicyDocument.layer),
  Effect.provide(CloudStorageStorageReader.layer),
  Effect.provide(CloudStorageStorageWriter.layer),
  Effect.provide(StorageClient.layer()),
  Effect.provide(PubsubClient.layer()),
  Effect.provide(InMemoryMessageQueue.layer),
  Effect.provide(logger),
  Effect.provide(otel)
)
