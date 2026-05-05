import { Cause, Effect, Logger, LogLevel, Record, FiberId, flow } from 'effect'
import { pino, type Level } from 'pino'
import type { Logger as PinoLogger } from 'pino'

const levels: Record<LogLevel.LogLevel['label'], Level | null> = {
  ALL: 'trace',
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

export const pretty = <E>(cause: Cause.Cause<E>) => {
  switch (cause._tag) {
    case 'Die':
      return null
    case 'Empty':
      return null
    case 'Fail':
      if (cause.error instanceof Error) {
        console.log(cause.error.name)
        return cause.error
      }
      return null
    case 'Interrupt':
      return null
    case 'Parallel':
      return null
    case 'Sequential':
      return null
  }
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
        cause: Cause.isEmpty(cause) ? undefined : pretty(cause),
        fiber: FiberId.threadName(fiberId),
        span:
          allSpans.length > 0
            ? allSpans.map((span) => span.label).join('.')
            : undefined,
      }

      if (Array.isArray(message) && message.length > 1) {
        logger[level]({ ...metadata, ...message[1] }, message[0])
      } else {
        logger[level](metadata, String(message))
      }
    }).pipe(Logger.withSpanAnnotations)
  )
)
