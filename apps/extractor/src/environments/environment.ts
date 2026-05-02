import { Effect } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

import {
  FileSystemStorageReader,
  FileSystemStorageWriter,
} from '@news-research/ingestion/pipeline/extract'
import {
  FileSystemPublisher,
  FileSystemMessageBatch,
} from '@news-research/ingestion/messaging'

import * as FileSystemFactChecksSchema from '../adapters/filesystem/FactChecksSchema'
import * as JobContext from '../JobContext'
import { Program } from '../program'

const otel = NodeSdk.layer(() => ({
  resource: { serviceName: 'extractor' },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
}))

export const main = Program.pipe(
  Effect.provide(FileSystemStorageReader.layer),
  Effect.provide(FileSystemStorageWriter.layer),
  Effect.provide(FileSystemMessageBatch.layer),
  Effect.provide(FileSystemPublisher.layer),
  Effect.provide(FileSystemFactChecksSchema.layer),
  Effect.provide(JobContext.layer),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(otel)
)
