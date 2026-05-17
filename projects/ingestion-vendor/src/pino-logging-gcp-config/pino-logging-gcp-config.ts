/* eslint-disable @typescript-eslint/no-explicit-any */
import { Config, Effect } from 'effect'
import { type LoggerOptions, levels } from 'pino'

import { createGcpLoggingPinoConfig } from '@google-cloud/pino-logging-gcp-config'

const PinoLogLevel = Config.literal(...Object.values(levels.labels))

export const make = Effect.gen(function* () {
  const service = yield* Config.string('SERVICE_NAME')
  const version = yield* Config.string('SERVICE_VERSION')
  const level = yield* PinoLogLevel('PINO_LOG_LEVEL')
  yield* Effect.logTrace(`Creating pino logging config with level ${level}`)
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
    messageKey: 'message',
    formatters: {
      ...config.formatters,
      // patch the log formatter to convert the `cause` property
      // to `err` for better compatibility with GCP Logging
      log: (obj: Record<string, unknown>) => {
        let input = obj
        if (config.formatters?.log) {
          input = config.formatters.log(input)
        }
        const { cause, ...rest } = input
        if (cause && cause instanceof Error) {
          return {
            ...rest,
            err: cause,
          }
        }
        return input
      },
    },
  }
})
