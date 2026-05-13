import { Effect, Layer, Logger } from 'effect'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeFileSystem } from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

import {
  FileSystemStorageReader,
  FileSystemStorageWriter,
} from '@news-research/ingestion-core/pipeline/shared'
import {
  FileSystemPublisher,
  FileSystemMessageQueueFeeder,
  InMemoryMessageQueue,
} from '@news-research/ingestion-messaging'

import * as FileSystemSanitizerPolicyDocument from '../adapters/filesystem/SanitizerPolicyDocument'
import { Program } from '../program'

const otel = NodeSdk.layer(() => ({
  resource: { serviceName: 'sanitizer' },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
}))

export const main = Effect.all(
  [Program, Layer.launch(FileSystemMessageQueueFeeder.layer)],
  { concurrency: 2 }
).pipe(
  Effect.provide(FileSystemStorageReader.layer),
  Effect.provide(FileSystemStorageWriter.layer),
  Effect.provide(InMemoryMessageQueue.layer),
  Effect.provide(FileSystemPublisher.layer),
  Effect.provide(FileSystemSanitizerPolicyDocument.layer),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(Logger.add(Logger.prettyLoggerDefault)),
  Effect.provide(Logger.remove(Logger.defaultLogger)),
  Effect.provide(otel)
)
