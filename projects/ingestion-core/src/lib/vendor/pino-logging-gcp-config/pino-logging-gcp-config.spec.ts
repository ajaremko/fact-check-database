import * as fs from 'fs/promises'
import { ConfigProvider, Data, Effect, Logger } from 'effect'

import { pinoLogger } from '../pino'

import * as GcpLoggingPinoConfig from './pino-logging-gcp-config'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('GcpLoggingPinoConfig', () => {
  const LOG_PATH = `tmp/pino-logging-gcp-config-${Date.now()}.log`

  const logger = Logger.addScoped(
    GcpLoggingPinoConfig.make.pipe(
      Effect.andThen((config) =>
        pinoLogger({
          ...config,
          transport: {
            target: 'pino/file',
            options: {
              destination: LOG_PATH,
              mkdir: true,
            },
          },
        })
      ),
      Effect.withConfigProvider(
        ConfigProvider.fromMap(
          new Map([
            ['SERVICE_NAME', 'test-service'],
            ['SERVICE_VERSION', '1'],
            ['PINO_LOG_LEVEL', 'trace'],
          ])
        )
      )
    )
  )

  class TestError extends Data.TaggedError('TestError')<{
    readonly cause: unknown
    readonly message: string
  }> {}

  it.sequential('should attach GCP logging config', async () => {
    await Effect.logInfo('Test log message').pipe(
      Effect.provide(logger),
      Effect.runPromise
    )

    await delay(2000)

    const data = await fs.readFile(LOG_PATH)
    const lines = data
      .toString()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .map((line) => JSON.parse(line))

    expect(lines[0].message).toBe('Test log message')
    expect(typeof lines[0].timestamp.seconds === 'number').toBe(true)
    expect(typeof lines[0].timestamp.nanos === 'number').toBe(true)
  })

  it.sequential(
    'should attach GCP logging config and encodes error details',
    async () => {
      await Effect.fail(
        new TestError({
          cause: new Error('Internal error'),
          message: 'Application threw an error',
        })
      )
        .pipe(Effect.catchAllCause(Effect.logError))
        .pipe(Effect.provide(logger), Effect.runPromise)

      await delay(2000)

      const data = await fs.readFile(LOG_PATH)
      const lines = data
        .toString()
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '')
        .map((line) => JSON.parse(line))

      expect(lines[1].err.type).toBe('TestError')
      expect(lines[1].err.message).toBe(
        'Application threw an error: Internal error'
      )
      expect(lines[1].err.stack).toBeDefined()
    }
  )
})
