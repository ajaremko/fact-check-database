import { Cause, Effect, Logger, LogLevel, Record, FiberId, flow } from 'effect'
import { pino, type Level } from 'pino'
import type { Logger as PinoLogger } from 'pino'

const levels: Record<LogLevel.LogLevel['label'], Level | null> = {
  ALL: 'debug',
  FATAL: 'fatal',
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace',
  OFF: null,
}

const acquire = flow(pino, Effect.succeed)

function release(logger: PinoLogger<string, boolean>) {
  return Effect.async<void, Error>((cb) => {
    logger.flush((err?: Error) => {
      if (err) {
        cb(Effect.fail(err))
      } else {
        cb(Effect.void)
      }
    })
  }).pipe(Effect.ignore)
}

export const pinoLogger = flow(
  acquire,
  Effect.acquireRelease(release),
  Effect.map((logger) =>
    Logger.make(({ logLevel, message, annotations, cause, fiberId, spans }) => {
      const level = levels[logLevel.label]
      if (level == null) {
        return
      }

      const annotationsMap: Record<string, unknown> = {}
      for (const [key, value] of annotations) {
        annotationsMap[key] = value
      }

      const allSpans = Array.from(spans)
      let spansMap: Record<string, number> | undefined = undefined
      const now = Date.now()
      for (const span of allSpans) {
        if (spansMap === undefined) {
          spansMap = {}
        }
        spansMap[span.label + '_ms'] = now - span.startTime
      }

      const metadata = {
        ...annotationsMap,
        ...spansMap,
        level: logLevel.label,
        cause: Cause.isEmpty(cause) ? undefined : Cause.pretty(cause),
        fiber: FiberId.threadName(fiberId),
        span:
          allSpans.length > 0
            ? allSpans.map((span) => span.label).join('.')
            : undefined,
      }

      if (Array.isArray(message) && message.length > 1) {
        logger[level]({ ...metadata, ...message[1] }, message[0])
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger[level](metadata, message as any)
      }
    }).pipe(Logger.withSpanAnnotations)
  )
)
