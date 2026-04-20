import { Effect } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

import {
  FileSystemStorageReader,
  FileSystemStorageWriter,
  FileSystemPublisher,
  InMemoryMessageQueue,
} from '@news-research/ingestion/adapters'

import * as FileSystemMessageQueueFeeder from '../adapters/filesystem/MessageQueueFeeder'
import * as FileSystemSanitizerPolicyDocument from '../adapters/filesystem/SanitizerPolicyDocument'
import * as Logger from '../Logger'
import { Program } from '../program'

const otel = NodeSdk.layer(() => ({
  resource: { serviceName: 'sanitizer' },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
}))

export const main = Program.pipe(
  Effect.provide(FileSystemStorageReader.layer),
  Effect.provide(FileSystemStorageWriter.layer),
  Effect.provide(FileSystemMessageQueueFeeder.layer),
  Effect.provide(FileSystemPublisher.layer),
  Effect.provide(FileSystemSanitizerPolicyDocument.layer),
  Effect.provide(InMemoryMessageQueue.layer),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(Logger.layer),
  Effect.provide(otel)
)
