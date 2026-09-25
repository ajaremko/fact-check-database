import { describe, it, expect } from '@effect/vitest'
import { Effect, Fiber } from 'effect'

import { MessageQueue } from '../ports/MessageQueue'

import * as InMemoryMessageQueue from '../adapters/InMemoryMessageQueue'

import { enqueueAndAwaitOutcome } from './enqueueAndAwaitOutcome'

describe('enqueueAndAwaitOutcome', () => {
  it.effect('resolves with onAck when the queued message is acked', () =>
    Effect.gen(function* () {
      const fiber = yield* enqueueAndAwaitOutcome({
        message: {
          data: Buffer.from('test'),
          attributes: {},
          messageId: 'test-message-id',
          publishTime: new Date('2026-01-01T00:00:00.000Z'),
        },
        onAck: Effect.succeed('acked'),
        onNack: Effect.succeed('nacked'),
      }).pipe(Effect.withSpan('test'), Effect.fork)

      const { messages } = yield* MessageQueue
      const queued = yield* messages.take
      yield* queued.ack

      const result = yield* Fiber.join(fiber)
      expect(result).toBe('acked')
    }).pipe(Effect.provide(InMemoryMessageQueue.layer))
  )

  it.effect('resolves with onNack when the queued message is nacked', () =>
    Effect.gen(function* () {
      const fiber = yield* enqueueAndAwaitOutcome({
        message: {
          data: Buffer.from('test'),
          attributes: {},
          messageId: 'test-message-id',
          publishTime: new Date('2026-01-01T00:00:00.000Z'),
        },
        onAck: Effect.succeed('acked'),
        onNack: Effect.succeed('nacked'),
      }).pipe(Effect.withSpan('test'), Effect.fork)

      const { messages } = yield* MessageQueue
      const queued = yield* messages.take
      yield* queued.nack

      const result = yield* Fiber.join(fiber)
      expect(result).toBe('nacked')
    }).pipe(Effect.provide(InMemoryMessageQueue.layer))
  )
})
