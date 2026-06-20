import { Config, Effect, Layer, Logger, LogLevel } from 'effect'
import { NodeFileSystem } from '@effect/platform-node'

import * as CloudPubsubPublisher from '@news-research/ingestion-messaging/adapters/CloudPubsubPublisher'
import * as FileSystemPublisher from '@news-research/ingestion-messaging/adapters/FileSystemPublisher'
import * as PubsubClient from '@news-research/core-vendor/cloud-pubsub/PubsubClient'

const MessagingModeConfig = Config.literal('gcp', 'filesystem')('MESSAGING_MODE')
const LoggingModeConfig = Config.literal('gcp', 'console')('LOGGING_MODE')
const LogLevelConfig = Config.logLevel('LOGGING_LEVEL')

const messaging = Layer.unwrapEffect(
  Effect.gen(function* () {
    const mode = yield* Config.withDefault(MessagingModeConfig, 'gcp')
    if (mode === 'filesystem') {
      return Layer.empty.pipe(
        Layer.merge(FileSystemPublisher.layer),
        Layer.provide(NodeFileSystem.layer)
      )
    }
    return Layer.empty.pipe(
      Layer.merge(CloudPubsubPublisher.layer),
      Layer.provide(PubsubClient.layer())
    )
  }).pipe(Effect.map(Layer.mergeAll))
)

const logger = Layer.unwrapEffect(
  Effect.gen(function* () {
    const mode = yield* Config.withDefault(LoggingModeConfig, 'console')
    const level = yield* Config.withDefault(LogLevelConfig, LogLevel.Info)
    // GCP pino logger can be wired here following ingestion-pipeline-ingestor pattern
    return Layer.mergeAll(
      Logger.minimumLogLevel(level),
      mode === 'console' ? Logger.pretty : Logger.json
    )
  })
)

export const appLayer = Layer.mergeAll(messaging, logger)
