import { Effect, Logger, Layer, Cause, ParseResult, ConfigError } from 'effect'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeSdk } from '@effect/opentelemetry'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'

import {
  CloudStorageStorageReader,
  CloudStorageStorageWriter,
  StorageWriter,
} from '@news-research/ingestion-core/pipeline/shared'
import {
  CloudPubsubMessageBatch,
  CloudPubsubPublisher,
  Publisher,
} from '@news-research/ingestion-core/messaging'
import {
  PubsubSubscriberClient,
  PubsubClient,
} from '@news-research/ingestion-core/vendor/cloud-pubsub'
import {
  StorageClient,
  StorageBucket,
} from '@news-research/ingestion-core/vendor/cloud-storage'
import { GcpLoggingPinoConfig } from '@news-research/ingestion-core/vendor/pino-logging-gcp-config'
import { cloudRunInstanceId } from '@news-research/ingestion-core/vendor/cloud-run'
import { pinoLogger } from '@news-research/ingestion-core/vendor/pino'
import { CloudStorageFactChecksTableSchema } from '@news-research/ingestion-core/pipeline/extract'

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

export type Main = Effect.Effect<
  void,
  | Cause.UnknownException
  | ParseResult.ParseError
  | Publisher.PublisherError
  | StorageWriter.StorageWriteError
  | ConfigError.ConfigError
  | PubsubSubscriberClient.PubsubSubscriberClientIOError
  | StorageBucket.StorageBucketIOError,
  never
>

export const main = Program.pipe(
  Effect.provide(CloudPubsubMessageBatch.layer),
  Effect.provide(CloudPubsubPublisher.layer),
  Effect.provide(CloudStorageStorageReader.layer),
  Effect.provide(CloudStorageStorageWriter.layer),
  Effect.provide(CloudStorageFactChecksTableSchema.layer),
  Effect.provide(PubsubSubscriberClient.layer()),
  Effect.provide(PubsubClient.layer()),
  Effect.provide(StorageClient.layer()),
  Effect.provide(JobContext.layer),
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
