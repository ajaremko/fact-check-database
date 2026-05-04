import { Effect } from 'effect'
import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

import {
  FileSystemStorageReader,
  FileSystemStorageWriter,
} from '@news-research/ingestion-core/pipeline/shared'
import { FileSystemPublisher } from '@news-research/ingestion-core/messaging'
import { HttpClientFetcher } from '@news-research/ingestion-core/pipeline/ingest'

import * as FileSystemTargetList from '../adapters/filesystem/TargetList'
import * as JobContext from '../JobContext'
import { Program } from '../program'

const otel = NodeSdk.layer(() => ({
  resource: { serviceName: 'ingestor' },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
}))

export const main = Program.pipe(
  Effect.provide(FileSystemStorageReader.layer),
  Effect.provide(FileSystemStorageWriter.layer),
  Effect.provide(FileSystemPublisher.layer),
  Effect.provide(FileSystemTargetList.layer),
  Effect.provide(HttpClientFetcher.layer),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(NodeHttpClient.layer),
  Effect.provide(JobContext.layer),
  Effect.provide(otel)
)
