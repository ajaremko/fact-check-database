import { Cause, Effect, Logger, LogLevel, Record, FiberId, flow } from 'effect'
import { pino, type Level } from 'pino'
import type { Logger as PinoLogger } from 'pino'

/**
 * Maps each Effect `LogLevel` label to the Pino level used to emit it.
 * `ALL` and `TRACE` both map to Pino's `trace`; `OFF` maps to `null`, which
 * {@link pinoLogger} treats as "do not log this line".
 */
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

/**
 * Reduces a `Cause` to a plain `Error` for logging, or `null` when there is
 * nothing useful to attach.
 *
 * Only a `Fail` whose error is already an `Error` instance is returned as
 * is. Every other case — `Die`, `Interrupt`, `Empty`, and the composite
 * `Parallel`/`Sequential` causes — returns `null` rather than attempting to
 * flatten or summarize them. In practice this means a defect or an
 * interruption logs without a `cause` payload; only a typed failure that
 * carries a real `Error` does.
 */
export const pretty = <E>(cause: Cause.Cause<E>) => {
  switch (cause._tag) {
    case 'Die':
      return null
    case 'Empty':
      return null
    case 'Fail':
      if (cause.error instanceof Error) {
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

/**
 * Builds a scoped Effect `Logger` backed by Pino.
 *
 * Takes the same options as the `pino()` constructor and returns an Effect
 * that acquires a Pino logger and releases it (flushing pending writes) when
 * the enclosing scope closes — provide it with `Logger.addScoped` inside a
 * `Effect.scoped` region, or as part of a scoped layer.
 *
 * Each Effect log entry is translated into one Pino call:
 *
 * - The log level is looked up in {@link levels}; a level that maps to
 *   `null` (`OFF`) is dropped instead of logged.
 * - Log annotations, computed span durations (as `<span label>_ms`), the
 *   dotted path of active span labels, and the current fiber's thread name
 *   are merged into the object passed to Pino.
 * - The failure `Cause`, if any, is reduced with {@link pretty} and attached
 *   as `cause`.
 * - A tuple message (`Effect.log('text', extra)`) treats the second element
 *   as additional fields merged into the log object, with the first element
 *   used as the Pino message string.
 *
 * `Logger.withSpanAnnotations` is applied to the result, so span timings are
 * available to be logged.
 *
 * @example
 * const logger = Logger.addScoped(pinoLogger({ level: 'info' }))
 * yield* Effect.logInfo('started').pipe(Effect.provide(logger))
 */
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

      const prettyCause = Cause.isEmpty(cause) ? undefined : pretty(cause)

      const metadata = {
        ...annotationsMap,
        ...spansMap,
        level: logLevel.label,
        cause: prettyCause,
        fiber: FiberId.threadName(fiberId),
        span:
          allSpans.length > 0
            ? allSpans.map((span) => span.label).join('.')
            : undefined,
      }

      if (Array.isArray(message)) {
        if (message.length === 0) {
          if (metadata.cause) {
            logger[level](metadata, String(metadata.cause))
          } else {
            logger[level](metadata, String(message))
          }
        } else if (message.length > 1) {
          logger[level]({ ...metadata, ...message[1] }, message[0])
        } else {
          logger[level](metadata, String(message))
        }
      } else {
        logger[level](metadata, String(message))
      }
    }).pipe(Logger.withSpanAnnotations)
  )
)
