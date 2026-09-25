import * as fs from 'fs/promises'
import { describe, expect, it } from 'vitest'
import { ConfigProvider, Data, Effect, Logger } from 'effect'

import { pinoLogger } from '../pino'

import * as GcpLoggingPinoConfig from './pino-logging-gcp-config'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('GcpLoggingPinoConfig', () => {
  it.sequential('should attach GCP logging config', async () => {
    const logPath = `tmp/pino-logging-gcp-config-${Date.now()}.log`

    await Effect.logInfo('Test log message').pipe(
      Effect.provide(
        Logger.addScoped(
          GcpLoggingPinoConfig.make.pipe(
            Effect.andThen((config) =>
              pinoLogger({
                ...config,
                transport: {
                  target: 'pino/file',
                  options: { destination: logPath, mkdir: true },
                },
              })
            ),
            Effect.withConfigProvider(
              ConfigProvider.fromMap(
                new Map([
                  ['SERVICE_NAME', 'test-service'],
                  ['SERVICE_VERSION', '1'],
                  ['LOGGING_LEVEL', 'trace'],
                ])
              )
            )
          )
        )
      ),
      Effect.runPromise
    )

    await delay(2000)

    const lines = (await fs.readFile(logPath))
      .toString()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .map((line) => JSON.parse(line))

    expect(lines[0].message).toBe('Test log message')
    expect(lines[0].serviceContext.service).toBe('test-service')
    expect(lines[0].serviceContext.version).toBe('1')
    expect(typeof lines[0]['logging.googleapis.com/insertId']).toBe('string')
    expect(typeof lines[0].timestamp.seconds).toBe('number')
    expect(typeof lines[0].timestamp.nanos).toBe('number')
  })

  it.sequential(
    'should attach GCP logging config and encodes error details',
    async () => {
      class TestError extends Data.TaggedError('TestError')<{
        readonly cause: unknown
        readonly message: string
      }> {}

      const logPath = `tmp/pino-logging-gcp-config-error-${Date.now()}.log`

      await Effect.fail(
        new TestError({
          cause: new Error('Internal error'),
          message: 'Something went wrong',
        })
      ).pipe(
        Effect.catchAllCause(Effect.logError),
        Effect.provide(
          Logger.addScoped(
            GcpLoggingPinoConfig.make.pipe(
              Effect.andThen((config) =>
                pinoLogger({
                  ...config,
                  transport: {
                    target: 'pino/file',
                    options: { destination: logPath, mkdir: true },
                  },
                })
              ),
              Effect.withConfigProvider(
                ConfigProvider.fromMap(
                  new Map([
                    ['SERVICE_NAME', 'test-service'],
                    ['SERVICE_VERSION', '1'],
                    ['LOGGING_LEVEL', 'trace'],
                  ])
                )
              )
            )
          )
        ),
        Effect.runPromise
      )

      await delay(2000)

      const lines = (await fs.readFile(logPath))
        .toString()
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '')
        .map((line) => JSON.parse(line))

      expect(lines[0].err.type).toBe('TestError')
      expect(lines[0].err.message).toBe('Something went wrong: Internal error')
      expect(lines[0].err.stack).toBeDefined()
      expect(lines[0].message).toBe('TestError: Something went wrong')
    }
  )
})
