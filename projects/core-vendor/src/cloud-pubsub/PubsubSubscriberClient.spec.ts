import { describe, it, expect, vi, afterEach } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { v1 } from '@google-cloud/pubsub'

import {
  PubsubSubscriberClient,
  PubsubSubscriberClientIOError,
  isDeadlineExceeded,
  pull,
} from './PubsubSubscriberClient'

describe('pull', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.effect('requests up to maxMessages with the client default deadline', () =>
    Effect.gen(function* () {
      const client = new v1.SubscriberClient()
      vi.spyOn(client, 'pull').mockResolvedValue([
        { receivedMessages: [] },
        undefined,
        undefined,
      ] as never)

      yield* pull('subscription-1', 25).pipe(
        Effect.provide(Layer.succeed(PubsubSubscriberClient, { client }))
      )

      expect(client.pull).toHaveBeenCalledWith({
        subscription: 'subscription-1',
        maxMessages: 25,
      })
    })
  )

  it.effect('passes a call timeout when one is given', () =>
    Effect.gen(function* () {
      const client = new v1.SubscriberClient()
      vi.spyOn(client, 'pull').mockResolvedValue([
        { receivedMessages: [] },
        undefined,
        undefined,
      ] as never)

      yield* pull('subscription-1', 25, { timeoutMillis: 5000 }).pipe(
        Effect.provide(Layer.succeed(PubsubSubscriberClient, { client }))
      )

      expect(client.pull).toHaveBeenCalledWith(
        { subscription: 'subscription-1', maxMessages: 25 },
        { timeout: 5000 }
      )
    })
  )

  it.effect('wraps a rejected pull as a PubsubSubscriberClientIOError', () =>
    Effect.gen(function* () {
      const client = new v1.SubscriberClient()
      vi.spyOn(client, 'pull').mockRejectedValue(
        Object.assign(new Error('Permission denied'), { code: 7 })
      )

      const result = yield* pull('subscription-1').pipe(
        Effect.flip,
        Effect.provide(Layer.succeed(PubsubSubscriberClient, { client }))
      )

      expect(result._tag).toBe('PubsubSubscriberClientIOError')
      expect(isDeadlineExceeded(result)).toBe(false)
    })
  )
})

describe('isDeadlineExceeded', () => {
  it('is true for a gRPC DEADLINE_EXCEEDED cause', () => {
    expect(
      isDeadlineExceeded(
        new PubsubSubscriberClientIOError({
          cause: Object.assign(new Error('Deadline exceeded'), { code: 4 }),
          message: 'Failed to pull messages from subscription',
        })
      )
    ).toBe(true)
  })

  it('is false for a cause with no code', () => {
    expect(
      isDeadlineExceeded(
        new PubsubSubscriberClientIOError({
          cause: new Error('socket hang up'),
          message: 'Failed to pull messages from subscription',
        })
      )
    ).toBe(false)
  })
})
