import { Effect, Layer, Logger } from 'effect'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeHttpClient } from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter'

import {
  CloudStorageStorageWriter,
  CloudPubsubPublisher,
} from '@news-research/ingestion/adapters'
import { PubsubClient } from '@news-research/cloud-pubsub'
import { StorageClient } from '@news-research/cloud-storage'
import { GcpLoggingPinoConfig } from '@news-research/pino-logging-gcp-config'
import { pinoLogger } from '@news-research/pino'

import * as CloudStorageTargetList from '../adapters/cloud-storage/TargetList'
import * as HttpClientFetcher from '../adapters/http-client/Fetcher'
import * as JobContext from '../JobContext'
import { Program } from '../program'

const cloudRunInstanceId = Effect.tryPromise(async (signal) => {
  const response = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/id',
    {
      headers: { 'Metadata-Flavor': 'Google' },
      signal,
    }
  )

  if (response.ok) {
    return await response.text()
  }

  throw new Error('Metadata server not available')
})

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

const logger = Logger.replaceScoped(
  Logger.defaultLogger,
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
  Effect.provide(otel)
)
