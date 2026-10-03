import { describe, it, expect, vi, afterEach } from '@effect/vitest'
import { ConfigProvider, Effect, Layer } from 'effect'
import { v1 } from '@google-cloud/pubsub'

import { PubsubSubscriberClient } from '@fact-check-database/core-vendor/cloud-pubsub/PubsubSubscriberClient'

import { MessageBatch } from '../ports/MessageBatch'

import * as CloudPubsubMessageBatch from './CloudPubsubMessageBatch'

describe('CloudPubsubMessageBatch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.effect(
    'acknowledges acked messages when the scope closes successfully',
    () =>
      Effect.gen(function* () {
        const client = new v1.SubscriberClient()
        vi.spyOn(client, 'pull')
          .mockResolvedValueOnce([
            {
              receivedMessages: [
                {
                  ackId: 'ack-1',
                  deliveryAttempt: 2,
                  message: {
                    data: Buffer.from('{}'),
                    messageId: 'message-1',
                    publishTime: { seconds: 1790253296, nanos: 0 },
                  },
                },
              ],
            },
            undefined,
            undefined,
          ] as never)
          .mockResolvedValue([
            { receivedMessages: [] },
            undefined,
            undefined,
          ] as never)
        vi.spyOn(client, 'acknowledge').mockResolvedValue([{}] as never)

        const result = yield* Effect.gen(function* () {
          const [message] = yield* MessageBatch
          yield* message.ack
          return message.message
        }).pipe(
          Effect.provide(CloudPubsubMessageBatch.layer),
          Effect.provide(Layer.succeed(PubsubSubscriberClient, { client })),
          Effect.withConfigProvider(
            ConfigProvider.fromMap(
              new Map([
                ['PUBSUB_SUBSCRIPTION_ID', 'subscription-1'],
                ['MESSAGE_BATCH_SIZE', '10'],
              ])
            )
          )
        )

        expect(result).toStrictEqual({
          data: Buffer.from('{}'),
          attributes: {},
          messageId: 'message-1',
          publishTime: new Date('2026-09-24T12:34:56.000Z'),
          deliveryAttempt: 2,
        })
        expect(client.acknowledge).toHaveBeenCalledWith({
          subscription: 'subscription-1',
          ackIds: ['ack-1'],
        })
      })
  )

  it.effect('acknowledges nothing when the scope closes with a failure', () =>
    Effect.gen(function* () {
      const client = new v1.SubscriberClient()
      vi.spyOn(client, 'pull')
        .mockResolvedValueOnce([
          {
            receivedMessages: [
              {
                ackId: 'ack-1',
                message: {
                  data: Buffer.from('{}'),
                  messageId: 'message-1',
                  publishTime: { seconds: 1790253296, nanos: 0 },
                },
              },
            ],
          },
          undefined,
          undefined,
        ] as never)
        .mockResolvedValue([
          { receivedMessages: [] },
          undefined,
          undefined,
        ] as never)
      vi.spyOn(client, 'acknowledge').mockResolvedValue([{}] as never)

      const result = yield* Effect.gen(function* () {
        const [message] = yield* MessageBatch
        yield* message.ack
        return yield* Effect.fail('Batch write failed')
      }).pipe(
        Effect.provide(CloudPubsubMessageBatch.layer),
        // flipped outside the layer, so the batch's scope closes with the failure
        Effect.flip,
        Effect.provide(Layer.succeed(PubsubSubscriberClient, { client })),
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([
              ['PUBSUB_SUBSCRIPTION_ID', 'subscription-1'],
              ['MESSAGE_BATCH_SIZE', '10'],
            ])
          )
        )
      )

      expect(result).toBe('Batch write failed')
      expect(client.acknowledge).not.toHaveBeenCalled()
    })
  )

  it.effect(
    'pulls again for the messages still missing until a pull returns none',
    () =>
      Effect.gen(function* () {
        const client = new v1.SubscriberClient()
        vi.spyOn(client, 'pull')
          .mockResolvedValueOnce([
            {
              receivedMessages: [
                {
                  ackId: 'ack-1',
                  message: {
                    data: Buffer.from('{}'),
                    messageId: 'message-1',
                    publishTime: { seconds: 1790253296, nanos: 0 },
                  },
                },
                {
                  ackId: 'ack-2',
                  message: {
                    data: Buffer.from('{}'),
                    messageId: 'message-2',
                    publishTime: { seconds: 1790253296, nanos: 0 },
                  },
                },
              ],
            },
            undefined,
            undefined,
          ] as never)
          .mockResolvedValueOnce([
            {
              receivedMessages: [
                {
                  ackId: 'ack-3',
                  message: {
                    data: Buffer.from('{}'),
                    messageId: 'message-3',
                    publishTime: { seconds: 1790253296, nanos: 0 },
                  },
                },
              ],
            },
            undefined,
            undefined,
          ] as never)
          .mockResolvedValue([
            { receivedMessages: [] },
            undefined,
            undefined,
          ] as never)

        const result = yield* MessageBatch.pipe(
          Effect.map((batch) => batch.map(({ message }) => message.messageId)),
          Effect.provide(CloudPubsubMessageBatch.layer),
          Effect.provide(Layer.succeed(PubsubSubscriberClient, { client })),
          Effect.withConfigProvider(
            ConfigProvider.fromMap(
              new Map([
                ['PUBSUB_SUBSCRIPTION_ID', 'subscription-1'],
                ['MESSAGE_BATCH_SIZE', '10'],
              ])
            )
          )
        )

        expect(result).toStrictEqual(['message-1', 'message-2', 'message-3'])
        expect(client.pull).toHaveBeenCalledTimes(3)
        expect(client.pull).toHaveBeenNthCalledWith(1, {
          subscription: 'subscription-1',
          maxMessages: 10,
        })
        expect(client.pull).toHaveBeenNthCalledWith(
          2,
          { subscription: 'subscription-1', maxMessages: 8 },
          { timeout: 10000 }
        )
        expect(client.pull).toHaveBeenNthCalledWith(
          3,
          { subscription: 'subscription-1', maxMessages: 7 },
          { timeout: 10000 }
        )
      })
  )

  it.effect('stops pulling once the batch is full', () =>
    Effect.gen(function* () {
      const client = new v1.SubscriberClient()
      vi.spyOn(client, 'pull').mockResolvedValue([
        {
          receivedMessages: [
            {
              ackId: 'ack-1',
              message: {
                data: Buffer.from('{}'),
                messageId: 'message-1',
                publishTime: { seconds: 1790253296, nanos: 0 },
              },
            },
          ],
        },
        undefined,
        undefined,
      ] as never)

      const result = yield* MessageBatch.pipe(
        Effect.map((batch) => batch.length),
        Effect.provide(CloudPubsubMessageBatch.layer),
        Effect.provide(Layer.succeed(PubsubSubscriberClient, { client })),
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([
              ['PUBSUB_SUBSCRIPTION_ID', 'subscription-1'],
              ['MESSAGE_BATCH_SIZE', '2'],
            ])
          )
        )
      )

      expect(result).toBe(2)
      expect(client.pull).toHaveBeenCalledTimes(2)
    })
  )

  it.effect(
    'treats a pull that runs out of time as the end of the messages',
    () =>
      Effect.gen(function* () {
        const client = new v1.SubscriberClient()
        vi.spyOn(client, 'pull')
          .mockResolvedValueOnce([
            {
              receivedMessages: [
                {
                  ackId: 'ack-1',
                  message: {
                    data: Buffer.from('{}'),
                    messageId: 'message-1',
                    publishTime: { seconds: 1790253296, nanos: 0 },
                  },
                },
              ],
            },
            undefined,
            undefined,
          ] as never)
          .mockRejectedValue(
            Object.assign(new Error('Deadline exceeded'), { code: 4 })
          )

        const result = yield* MessageBatch.pipe(
          Effect.map((batch) => batch.map(({ message }) => message.messageId)),
          Effect.provide(CloudPubsubMessageBatch.layer),
          Effect.provide(Layer.succeed(PubsubSubscriberClient, { client })),
          Effect.withConfigProvider(
            ConfigProvider.fromMap(
              new Map([
                ['PUBSUB_SUBSCRIPTION_ID', 'subscription-1'],
                ['MESSAGE_BATCH_SIZE', '10'],
              ])
            )
          )
        )

        expect(result).toStrictEqual(['message-1'])
        expect(client.pull).toHaveBeenCalledTimes(2)
      })
  )

  it.effect('yields an empty batch when the subscription has no messages', () =>
    Effect.gen(function* () {
      const client = new v1.SubscriberClient()
      vi.spyOn(client, 'pull').mockRejectedValue(
        Object.assign(new Error('Deadline exceeded'), { code: 4 })
      )

      const result = yield* MessageBatch.pipe(
        Effect.provide(CloudPubsubMessageBatch.layer),
        Effect.provide(Layer.succeed(PubsubSubscriberClient, { client })),
        Effect.withConfigProvider(
          ConfigProvider.fromMap(
            new Map([
              ['PUBSUB_SUBSCRIPTION_ID', 'subscription-1'],
              ['MESSAGE_BATCH_SIZE', '10'],
            ])
          )
        )
      )

      expect(result).toStrictEqual([])
      expect(client.pull).toHaveBeenCalledTimes(1)
    })
  )
})
