import { describe, it, expect, vi, afterEach } from '@effect/vitest'
import { Effect, HashMap, Layer, Logger, LogLevel } from 'effect'
import { File, Storage } from '@google-cloud/storage'

import { StorageBucket, writeFile } from './StorageBucket'

describe('writeFile', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.effect('logs a trace with the bucket and file name once written', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []
      vi.spyOn(File.prototype, 'save').mockResolvedValue(undefined as never)

      yield* writeFile('v1/a.json', 'data', {
        contentType: 'application/json',
      }).pipe(
        Effect.provide(
          Layer.succeed(StorageBucket, {
            bucket: new Storage().bucket('test-bucket'),
          })
        ),
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

      expect(File.prototype.save).toHaveBeenCalledWith('data', {
        contentType: 'application/json',
      })
      expect(logs).toStrictEqual([
        {
          level: 'TRACE',
          message: ['File written'],
          annotations: {
            module: 'StorageBucket',
            'bucket.name': 'test-bucket',
            'file.name': 'v1/a.json',
            contentType: 'application/json',
          },
        },
      ])
    })
  )

  it.effect('logs a debug with the error tag and status code on failure', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []
      vi.spyOn(File.prototype, 'save').mockRejectedValue(
        Object.assign(new Error('Forbidden'), { code: 403 })
      )

      const result = yield* writeFile('v1/a.json', 'data').pipe(
        Effect.flip,
        Effect.provide(
          Layer.succeed(StorageBucket, {
            bucket: new Storage().bucket('test-bucket'),
          })
        ),
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

      expect(result._tag).toBe('StorageBucketIOError')
      expect(logs).toStrictEqual([
        {
          level: 'DEBUG',
          message: ['File write failed'],
          annotations: {
            module: 'StorageBucket',
            'bucket.name': 'test-bucket',
            'file.name': 'v1/a.json',
            'error._tag': 'StorageBucketIOError',
            'cause.code': 403,
          },
        },
      ])
    })
  )
})
