import { describe, it, expect, vi, afterEach } from '@effect/vitest'
import { Effect, HashMap, Logger, LogLevel } from 'effect'
import { PubSub } from '@google-cloud/pubsub'

import * as PubsubClient from './PubsubClient'

describe('PubsubClient.layer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.effect('closes the client when the layer is released', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []
      vi.spyOn(PubSub.prototype, 'close').mockResolvedValue(undefined)

      yield* PubsubClient.PubsubClient.pipe(
        Effect.provide(PubsubClient.layer()),
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

      expect(PubSub.prototype.close).toHaveBeenCalledTimes(1)
      expect(logs).toStrictEqual([
        {
          level: 'TRACE',
          message: ['Client created'],
          annotations: { module: 'PubsubClient' },
        },
        {
          level: 'TRACE',
          message: ['Client closed'],
          annotations: { module: 'PubsubClient' },
        },
      ])
    })
  )

  it.effect('logs a debug and still releases when closing fails', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []
      vi.spyOn(PubSub.prototype, 'close').mockRejectedValue(
        Object.assign(new Error('Unavailable'), { code: 14 })
      )

      yield* PubsubClient.PubsubClient.pipe(
        Effect.provide(PubsubClient.layer()),
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
          level: 'TRACE',
          message: ['Client created'],
          annotations: { module: 'PubsubClient' },
        },
        {
          level: 'DEBUG',
          message: ['Client close failed'],
          annotations: {
            module: 'PubsubClient',
            'error._tag': 'PubsubClientIOError',
            'cause.code': 14,
          },
        },
      ])
    })
  )
})
