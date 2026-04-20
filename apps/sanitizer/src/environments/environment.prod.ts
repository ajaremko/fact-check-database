import { Effect, Logger } from 'effect'
import { NodeSdk } from '@effect/opentelemetry'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { GcpLoggingPinoConfig } from '@news-research/pino-logging-gcp-config'
import { pinoLogger } from '@news-research/pino'

import {
  CloudStorageStorageReader,
  CloudStorageStorageWriter,
  CloudPubsubPublisher,
  InMemoryMessageQueue,
} from '@news-research/ingestion/adapters'
import { StorageClient, StorageBucketCache } from '@news-research/cloud-storage'
import { PubsubClient } from '@news-research/cloud-pubsub'

import * as HttpServerMessageQueueFeeder from '../adapters/http-server/MessageQueueFeeder'
import * as CloudStorageSanitizerPolicyDocument from '../adapters/cloud-storage/SanitizerPolicyDocument'
import { Program } from '../program'

const otel = NodeSdk.layer(() => ({
  resource: { serviceName: 'ingestor' },
  traceExporter: new TraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
}))

const logger = Logger.replaceScoped(
  Logger.defaultLogger,
  GcpLoggingPinoConfig.make.pipe(Effect.andThen((config) => pinoLogger(config)))
)

export const main = Program.pipe(
  Effect.provide(HttpServerMessageQueueFeeder.layer),
  Effect.provide(CloudPubsubPublisher.layer),
  Effect.provide(CloudStorageSanitizerPolicyDocument.layer),
  Effect.provide(CloudStorageStorageReader.layer),
  Effect.provide(CloudStorageStorageWriter.layer),
  Effect.provide(StorageBucketCache.layer()),
  Effect.provide(StorageClient.layer()),
  Effect.provide(PubsubClient.layer()),
  Effect.provide(InMemoryMessageQueue.layer),
  Effect.provide(logger),
  Effect.provide(otel)
)
