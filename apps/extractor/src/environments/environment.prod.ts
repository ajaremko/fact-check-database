import { Effect, Logger } from 'effect'
import { NodeSdk } from '@effect/opentelemetry'
import { GcpLoggingPinoConfig } from '@news-research/pino-logging-gcp-config'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'

import {
  CloudStorageStorageReader,
  CloudStorageStorageWriter,
  CloudPubsubMessageBatch,
  CloudPubsubPublisher,
} from '@news-research/ingestion/adapters'
import {
  PubsubSubscriberClient,
  PubsubClient,
} from '@news-research/cloud-pubsub'
import { StorageClient, StorageBucketCache } from '@news-research/cloud-storage'
import { pinoLogger } from '@news-research/pino'

import * as JobContext from '../JobContext'
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
  Effect.provide(CloudPubsubMessageBatch.layer),
  Effect.provide(CloudPubsubPublisher.layer),
  Effect.provide(CloudStorageStorageReader.layer),
  Effect.provide(CloudStorageStorageWriter.layer),
  Effect.provide(PubsubSubscriberClient.layer()),
  Effect.provide(PubsubClient.layer()),
  Effect.provide(StorageBucketCache.layer()),
  Effect.provide(StorageClient.layer()),
  Effect.provide(JobContext.layer),
  Effect.provide(logger),
  Effect.provide(otel)
)
