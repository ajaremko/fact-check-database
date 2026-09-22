import { Config, Effect, Layer, Logger, LogLevel } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

import * as CloudStorageStorageWriter from '@fact-check-database/core-io/adapters/CloudStorageStorageWriter'
import * as FileSystemStorageWriter from '@fact-check-database/core-io/adapters/FileSystemStorageWriter'
import * as StorageClient from '@fact-check-database/core-vendor/cloud-storage/StorageClient'

const LoggingModeConfig = Config.literal('gcp', 'console')('LOGGING_MODE')
const LogLevelConfig = Config.logLevel('LOGGING_LEVEL')

const StorageModeConfig = Config.literal('gcp', 'filesystem')('STORAGE_MODE')

const storage = Layer.unwrapEffect(
  Effect.gen(function* () {
    const storageMode = yield* Config.withDefault(StorageModeConfig, 'gcp')
    if (storageMode === 'filesystem') {
      yield* Effect.logDebug('Using filesystem storage')
      return Layer.empty.pipe(
        Layer.merge(FileSystemStorageWriter.layer),
        Layer.provide(NodeFileSystem.layer)
      )
    }
    yield* Effect.logDebug('Using gcs storage')
    return Layer.empty.pipe(
      Layer.merge(CloudStorageStorageWriter.layer),
      Layer.provide(StorageClient.layer())
    )
  })
)

const logger = Layer.unwrapEffect(
  Effect.gen(function* () {
    const mode = yield* Config.withDefault(LoggingModeConfig, 'console')
    const level = yield* Config.withDefault(LogLevelConfig, LogLevel.Info)
    // GCP pino logger can be wired here following ingestion-ingestor pattern
    return Layer.mergeAll(
      Logger.minimumLogLevel(level),
      mode === 'console' ? Logger.pretty : Logger.json
    )
  })
)

export const appLayer = Layer.mergeAll(storage, logger)
