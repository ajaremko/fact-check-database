import { Config, Effect, Layer, Logger, LogLevel } from 'effect'
import { NodeRuntime, NodeFileSystem } from '@effect/platform-node'
import * as HttpServerMessageQueueFeeder from '@news-research/ingestion-messaging/adapters/HttpServerMessageQueueFeeder'
import * as FilesystemMessageQueueFeeder from '@news-research/ingestion-messaging/adapters/FileSystemMessageQueueFeeder'
import * as InMemoryMessageQueue from '@news-research/ingestion-messaging/adapters/InMemoryMessageQueue'
import * as GcpLoggingPinoConfig from '@news-research/core-vendor/pino-logging-gcp-config'
import { pinoLogger } from '@news-research/core-vendor/pino'

import { Program } from './Program.js'

const MessagingModeConfig = Config.literal(
  'gcp',
  'filesystem'
)('MESSAGING_MODE')
const LoggingModeConfig = Config.literal('gcp', 'console')('LOGGING_MODE')
const LoggingLevelConfig = Config.logLevel('LOGGING_LEVEL')

function withMinimumLogLevel<A, E, R>(self: Effect.Effect<A, E, R>) {
  return Config.withDefault(LoggingLevelConfig, LogLevel.Info).pipe(
    Effect.andThen((level) => Logger.withMinimumLogLevel(self, level))
  )
}

const logger = Layer.unwrapEffect(
  Effect.gen(function* () {
    const loggingMode = yield* Config.withDefault(LoggingModeConfig, 'gcp')

    if (loggingMode === 'console') {
      return Layer.empty.pipe(
        Layer.merge(Logger.add(Logger.prettyLoggerDefault)),
        Layer.merge(Logger.remove(Logger.defaultLogger))
      )
    }

    const gcpLogger = GcpLoggingPinoConfig.make.pipe(
      Effect.andThen((config) => pinoLogger(config))
    )

    return Layer.empty.pipe(
      Layer.merge(Logger.addScoped(gcpLogger)),
      Layer.merge(Logger.remove(Logger.defaultLogger))
    )
  })
)

function withMessageQueueFeeder<A, E, R>(self: Effect.Effect<A, E, R>) {
  return Effect.gen(function* () {
    yield* Effect.logInfo('Starting message queue feeder')
    const messagingMode = yield* Config.withDefault(MessagingModeConfig, 'gcp')

    if (messagingMode === 'filesystem') {
      yield* Effect.logInfo('Using filesystem message queue feeder')
      const layer = Layer.empty.pipe(
        Layer.merge(FilesystemMessageQueueFeeder.layer),
        Layer.provide(NodeFileSystem.layer)
      )
      return yield* Effect.all([self, Layer.launch(layer)], {
        concurrency: 'unbounded',
      })
    }

    yield* Effect.logInfo('Using http server message queue feeder')
    const server = HttpServerMessageQueueFeeder.layer('/submissions')
    return yield* Effect.all([self, Layer.launch(server)], {
      concurrency: 'unbounded',
    })
  })
}

withMessageQueueFeeder(Program).pipe(
  Effect.provide(InMemoryMessageQueue.layer),
  Effect.provide(logger),
  withMinimumLogLevel,
  NodeRuntime.runMain({ disablePrettyLogger: true })
)
