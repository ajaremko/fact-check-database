import { describe, it, expect } from '@effect/vitest'
import { Data, Effect, HashMap, Logger, LogLevel } from 'effect'

import { logSdkFailure } from './logSdkFailure'

class TestError extends Data.TaggedError('TestError')<{
  readonly cause: unknown
}> {}

describe('logSdkFailure', () => {
  it.effect('logs a debug entry with the error tag and the cause code', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []

      yield* Effect.fail(new TestError({ cause: { code: 404 } })).pipe(
        logSdkFailure('Download failed'),
        Effect.ignore,
        Effect.provide(
          Logger.replace(
            Logger.defaultLogger,
            Logger.make(({ logLevel, message, annotations }) => {
              logs.push({
                level: logLevel.label,
                message,
                annotations: Object.fromEntries(HashMap.toEntries(annotations)),
              })
            })
          )
        ),
        Logger.withMinimumLogLevel(LogLevel.All)
      )

      expect(logs).toStrictEqual([
        {
          level: 'DEBUG',
          message: ['Download failed'],
          annotations: { 'error._tag': 'TestError', 'cause.code': 404 },
        },
      ])
    })
  )

  it.effect('reads the status code from `status` when there is no `code`', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []

      yield* Effect.fail(new TestError({ cause: { status: 429 } })).pipe(
        logSdkFailure('Save failed'),
        Effect.ignore,
        Effect.provide(
          Logger.replace(
            Logger.defaultLogger,
            Logger.make(({ logLevel, message, annotations }) => {
              logs.push({
                level: logLevel.label,
                message,
                annotations: Object.fromEntries(HashMap.toEntries(annotations)),
              })
            })
          )
        ),
        Logger.withMinimumLogLevel(LogLevel.All)
      )

      expect(logs).toStrictEqual([
        {
          level: 'DEBUG',
          message: ['Save failed'],
          annotations: { 'error._tag': 'TestError', 'cause.code': 429 },
        },
      ])
    })
  )

  it.effect('annotates only the error tag when the cause has no code', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []

      yield* Effect.fail(
        new TestError({ cause: new Error('socket hang up') })
      ).pipe(
        logSdkFailure('Pull failed'),
        Effect.ignore,
        Effect.provide(
          Logger.replace(
            Logger.defaultLogger,
            Logger.make(({ logLevel, message, annotations }) => {
              logs.push({
                level: logLevel.label,
                message,
                annotations: Object.fromEntries(HashMap.toEntries(annotations)),
              })
            })
          )
        ),
        Logger.withMinimumLogLevel(LogLevel.All)
      )

      expect(logs).toStrictEqual([
        {
          level: 'DEBUG',
          message: ['Pull failed'],
          annotations: { 'error._tag': 'TestError' },
        },
      ])
    })
  )

  it.effect('passes the error through unchanged', () =>
    Effect.gen(function* () {
      const result = yield* Effect.fail(
        new TestError({ cause: { code: 404 } })
      ).pipe(logSdkFailure('Download failed'), Effect.flip)

      expect(result).toStrictEqual(new TestError({ cause: { code: 404 } }))
    })
  )
})
