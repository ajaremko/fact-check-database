import { Effect, Layer, Logger } from 'effect'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeHttpClient } from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'

import { CloudStorageStorageWriter } from '@news-research/ingestion-core/pipeline/shared'
import { CloudPubsubPublisher } from '@news-research/ingestion-core/messaging'
import { HttpClientFetcher } from '@news-research/ingestion-core/pipeline/ingest'
import { PubsubClient } from '@news-research/ingestion-core/vendor/cloud-pubsub'
import { StorageClient } from '@news-research/ingestion-core/vendor/cloud-storage'
import { GcpLoggingPinoConfig } from '@news-research/ingestion-core/vendor/pino-logging-gcp-config'
import { cloudRunInstanceId } from '@news-research/ingestion-core/vendor/cloud-run'
import { pinoLogger } from '@news-research/ingestion-core/vendor/pino'

import * as CloudStorageTargetList from '../adapters/cloud-storage/TargetList'
import * as JobContext from '../JobContext'
import { Program } from '../program'

const otel = cloudRunInstanceId.pipe(
  Effect.map((instanceId) =>
    NodeSdk.layer(() => ({
      resource: {
        serviceName: 'ingestor',
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

const logger = Logger.addEffect(
  GcpLoggingPinoConfig.make.pipe(Effect.andThen((config) => pinoLogger(config)))
)

export const main = Program.pipe(
  Effect.provide(CloudPubsubPublisher.layer),
  Effect.provide(CloudStorageStorageWriter.layer),
  Effect.provide(CloudStorageTargetList.layer),
  Effect.provide(PubsubClient.layer()),
  Effect.provide(StorageClient.layer()),
  Effect.provide(HttpClientFetcher.layer),
  Effect.provide(NodeHttpClient.layer),
  Effect.provide(JobContext.layer),
  Effect.provide(logger),
  Effect.provide(Logger.remove(Logger.prettyLoggerDefault)),
  Effect.provide(otel)
)
