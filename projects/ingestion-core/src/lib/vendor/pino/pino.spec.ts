import * as fs from 'fs/promises'
import { Data, Effect, Logger, LogLevel } from 'effect'

import { pinoLogger } from './pino'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('pinoLogger', () => {
  const LOG_PATH = `tmp/pino-${Date.now()}.log`

  const logger = Logger.addScoped(
    pinoLogger({
      level: 'trace',
      transport: {
        target: 'pino/file',
        options: {
          destination: LOG_PATH,
          mkdir: true,
        },
      },
    })
  )

  it.sequential(
    'should create a logger and log at all log levels',
    async () => {
      await Effect.gen(function* () {
        yield* Effect.logTrace('trace message')
        yield* Effect.logDebug('debug message')
        yield* Effect.logInfo('info message')
        yield* Effect.logWarning('warning message')
        yield* Effect.logError('error message')
        yield* Effect.logFatal('fatal message')
      }).pipe(
        Logger.withMinimumLogLevel(LogLevel.All),
        Effect.provide(logger),
        Effect.runPromise
      )

      await delay(1000)

      const data = await fs.readFile(LOG_PATH)
      const lines = data
        .toString()
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '')
        .map((line) => JSON.parse(line))

      expect(lines[0].level).toBe('TRACE')
      expect(lines[0].fiber).toBeDefined()
      expect(lines[0].time).toBeDefined()
      expect(lines[0].hostname).toBeDefined()

      expect(lines[1].level).toBe('DEBUG')
      expect(lines[1].fiber).toBeDefined()
      expect(lines[1].time).toBeDefined()
      expect(lines[1].hostname).toBeDefined()

      expect(lines[2].level).toBe('INFO')
      expect(lines[2].fiber).toBeDefined()
      expect(lines[2].time).toBeDefined()
      expect(lines[2].hostname).toBeDefined()

      expect(lines[3].level).toBe('WARN')
      expect(lines[3].fiber).toBeDefined()
      expect(lines[3].time).toBeDefined()
      expect(lines[3].hostname).toBeDefined()

      expect(lines[4].level).toBe('ERROR')
      expect(lines[4].fiber).toBeDefined()
      expect(lines[4].time).toBeDefined()
      expect(lines[4].hostname).toBeDefined()

      expect(lines[5].level).toBe('FATAL')
      expect(lines[5].fiber).toBeDefined()
      expect(lines[5].time).toBeDefined()
      expect(lines[5].hostname).toBeDefined()
    }
  )

  class TestError extends Data.TaggedError('TestError')<{
    readonly cause: unknown
    readonly message: string
  }> {}

  it.sequential('should pass cause information correctly', async () => {
    await Effect.fail(
      new TestError({
        message: 'test error',
        cause: new Error('Internal error'),
      })
    ).pipe(
      Effect.catchAllCause(Effect.logError),
      Logger.withMinimumLogLevel(LogLevel.All),
      Effect.provide(logger),
      Effect.runPromise
    )

    await delay(1000)

    const data = await fs.readFile(LOG_PATH)
    const lines = data
      .toString()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .map((line) => JSON.parse(line))

    expect(lines[6].level).toBe('ERROR')
    expect(lines[6].cause).toBeDefined()
  })
})
