import { Effect, Logger, Layer } from 'effect'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeSdk } from '@effect/opentelemetry'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'

import {
  CloudStorageStorageReader,
  CloudStorageStorageWriter,
} from '@news-research/ingestion/pipeline/shared'
import {
  CloudPubsubMessageBatch,
  CloudPubsubPublisher,
} from '@news-research/ingestion/messaging'
import {
  PubsubSubscriberClient,
  PubsubClient,
} from '@news-research/cloud-pubsub'
import { StorageClient } from '@news-research/cloud-storage'
import { GcpLoggingPinoConfig } from '@news-research/pino-logging-gcp-config'
import { cloudRunInstanceId } from '@news-research/cloud-run'
import { pinoLogger } from '@news-research/pino'

import * as CloudStorageFactChecksSchema from '../adapters/cloud-storage/FactChecksSchema'
import * as JobContext from '../JobContext'
import { Program } from '../program'

const otel = cloudRunInstanceId.pipe(
  Effect.map((instanceId) =>
    NodeSdk.layer(() => ({
      resource: {
        serviceName: 'extractor',
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
  Effect.provide(CloudPubsubMessageBatch.layer),
  Effect.provide(CloudPubsubPublisher.layer),
  Effect.provide(CloudStorageStorageReader.layer),
  Effect.provide(CloudStorageStorageWriter.layer),
  Effect.provide(CloudStorageFactChecksSchema.layer),
  Effect.provide(PubsubSubscriberClient.layer()),
  Effect.provide(PubsubClient.layer()),
  Effect.provide(StorageClient.layer()),
  Effect.provide(JobContext.layer),
  Effect.provide(logger),
  Effect.provide(otel)
)
