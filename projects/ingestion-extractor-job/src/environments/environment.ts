import { ConfigError, Effect, ParseResult, Logger } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'
import { NodeSdk } from '@effect/opentelemetry'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

import {
  FileSystemStorageReader,
  FileSystemStorageWriter,
  StorageWriter,
} from '@news-research/ingestion-core/pipeline/shared'
import {
  FileSystemPublisher,
  FileSystemMessageBatch,
  Publisher,
} from '@news-research/ingestion-core/messaging'

import * as FileSystemFactChecksSchema from '../adapters/filesystem/FactChecksSchema'
import * as JobContext from '../JobContext'
import { Program } from '../program'
import { PlatformError } from '@effect/platform/Error'

const otel = NodeSdk.layer(() => ({
  resource: { serviceName: 'extractor' },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
}))

export type Main = Effect.Effect<
  void,
  | ParseResult.ParseError
  | Publisher.PublisherError
  | StorageWriter.StorageWriteError
  | PlatformError
  | ConfigError.ConfigError,
  never
>

export const main = Program.pipe(
  Effect.provide(FileSystemStorageReader.layer),
  Effect.provide(FileSystemStorageWriter.layer),
  Effect.provide(FileSystemMessageBatch.layer),
  Effect.provide(FileSystemPublisher.layer),
  Effect.provide(FileSystemFactChecksSchema.layer),
  Effect.provide(JobContext.layer),
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(Logger.add(Logger.prettyLoggerDefault)),
  Effect.provide(Logger.remove(Logger.defaultLogger)),
  Effect.provide(otel)
)
