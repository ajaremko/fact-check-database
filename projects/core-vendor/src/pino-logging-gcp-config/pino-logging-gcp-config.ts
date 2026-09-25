import { Config, Effect } from 'effect'
import { type LoggerOptions, levels } from 'pino'

import { createGcpLoggingPinoConfig } from '@google-cloud/pino-logging-gcp-config'

const PinoLogLevel = Config.literal(...Object.values(levels.labels))

/**
 * Effect that builds Pino `LoggerOptions` formatted for Google Cloud
 * Logging, ready to pass to `pinoLogger` from `@fact-check-database/core-vendor/pino`.
 *
 * Reads `SERVICE_NAME`, `SERVICE_VERSION` and `LOGGING_LEVEL` (one of Pino's
 * level labels) from `Config`, and wraps
 * `@google-cloud/pino-logging-gcp-config`'s `createGcpLoggingPinoConfig` with
 * two adjustments:
 *
 * - `messageKey` is set to `'message'`, matching the field Cloud Logging
 *   displays as the log entry's summary.
 * - The log formatter renames an object's `cause` property to `err` when the
 *   value is an `Error`, because Cloud Logging only recognizes error reports
 *   under `err`. Any existing `formatters.log` from the base config still
 *   runs first.
 *
 * @example
 * const config = yield* make
 * const logger = Logger.addScoped(pinoLogger(config))
 */
export const make = Effect.gen(function* () {
  const service = yield* Config.string('SERVICE_NAME')
  const version = yield* Config.string('SERVICE_VERSION')
  const level = yield* PinoLogLevel('LOGGING_LEVEL')
  yield* Effect.logTrace('Logging config created').pipe(
    Effect.annotateLogs({
      module: 'pino-logging-gcp-config',
      service,
      version,
      level,
    })
  )
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
