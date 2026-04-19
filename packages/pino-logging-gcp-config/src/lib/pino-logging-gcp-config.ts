import { Config, Effect } from 'effect'
import { createGcpLoggingPinoConfig } from '@google-cloud/pino-logging-gcp-config'
import { type LoggerOptions, levels } from 'pino'

const PinoLogLevel = Config.literal(...Object.values(levels.labels))

export const make = Effect.gen(function* () {
  const service = yield* Config.string('SERVICE_NAME')
  const version = yield* Config.string('SERVICE_VERSION')
  const level = yield* PinoLogLevel('PINO_LOG_LEVEL')
  return createGcpLoggingPinoConfig(
    {
      serviceContext: {
        service,
        version,
      },
    },
    { level }
  ) as LoggerOptions<string, boolean>
})
