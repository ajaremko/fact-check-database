import { Config, Effect } from 'effect'
import { type LoggerOptions, levels } from 'pino'

import { createGcpLoggingPinoConfig } from '@google-cloud/pino-logging-gcp-config'

const PinoLogLevel = Config.literal(...Object.values(levels.labels))

export const make = Effect.gen(function* () {
  const service = yield* Config.string('SERVICE_NAME')
  const version = yield* Config.string('SERVICE_VERSION')
  const level = yield* PinoLogLevel('PINO_LOG_LEVEL')
  const config = createGcpLoggingPinoConfig(
    {
      serviceContext: {
        service,
        version,
      },
    },
    { level }
  ) as LoggerOptions<string, boolean>
  return {
    ...config,
    formatters: {
      ...config.formatters,
      // patch the log formatter to convert the `cause` property to `err` for better compatibility with GCP Logging
      log: (obj: Record<string, unknown>) => {
        const { cause, ...rest } = obj
        if (cause && typeof cause === 'object') {
          return {
            ...rest,
            err: cause,
          }
        }
        return rest
      },
    },
  }
})
