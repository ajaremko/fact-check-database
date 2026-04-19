import { Effect, Logger } from 'effect'
import { NodeHttpClient } from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { GcpLoggingPinoConfig } from '@news-research/pino-logging-gcp-config'

import {
  CloudStorageStorageWriter,
  CloudPubsubPublisher,
} from '@news-research/ingestion/adapters'
import { PubsubClient } from '@news-research/cloud-pubsub'
import { StorageClient } from '@news-research/cloud-storage'
import { pinoLogger } from '@news-research/pino'

import * as CloudStorageTargetList from '../adapters/cloud-storage/TargetList'
import * as HttpClientFetcher from '../adapters/http-client/Fetcher'
import * as JobContext from '../JobContext'
import { Program } from '../program'

const otel = NodeSdk.layer(() => ({
  resource: { serviceName: 'ingestor' },
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
}))

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
