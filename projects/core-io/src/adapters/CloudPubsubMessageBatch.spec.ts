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
        vi.spyOn(client, 'pull').mockResolvedValue([
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
})
