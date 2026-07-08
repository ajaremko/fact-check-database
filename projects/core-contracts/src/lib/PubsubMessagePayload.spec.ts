import { it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import { describe } from 'vitest'

import {
  parsePubsubMessagePayloadData,
  PubsubMessagePayload,
} from './PubsubMessagePayload'

describe('PubsubMessagePayload', () => {
  describe('parsePubsubMessagePayloadData', () => {
    it('can encode a string to a base64 string', () => {
      expect(
        Schema.encodeSync(parsePubsubMessagePayloadData(Schema.String))(
          'Hello World!'
        )
      ).toBe('SGVsbG8gV29ybGQh')
    })
    it('can decode a base64 string to a string', () => {
      expect(
        Schema.decodeSync(parsePubsubMessagePayloadData(Schema.String))(
          'SGVsbG8gV29ybGQh'
        )
      ).toBe('Hello World!')
    })
  })
  describe('PubsubMessagePayload', () => {
    it('can encode a gcp message', () => {
      expect(
        Schema.encodeSync(PubsubMessagePayload)({
          message: {
            attributes: {
              key1: 'value1',
              key2: 'value2',
            },
            data: 'SGVsbG8gV29ybGQh',
            messageId: '123456789012345',
            publishTime: new Date(0),
          },
          subscription:
            'projects/my-gcp-project/subscriptions/my-push-subscription',
        })
      ).toStrictEqual({
        message: {
          attributes: {
            key1: 'value1',
            key2: 'value2',
          },
          data: 'SGVsbG8gV29ybGQh',
          messageId: '123456789012345',
          publishTime: '1970-01-01T00:00:00.000Z',
        },
        subscription:
          'projects/my-gcp-project/subscriptions/my-push-subscription',
      })
    })
    it('can decode a gcp message', () => {
      expect(
        Schema.decodeSync(PubsubMessagePayload)({
          message: {
            attributes: {
              key1: 'value1',
              key2: 'value2',
            },
            data: 'SGVsbG8gV29ybGQh',
            messageId: '123456789012345',
            publishTime: '2026-07-08T12:00:00Z',
          },
          subscription:
            'projects/my-gcp-project/subscriptions/my-push-subscription',
        })
      ).toStrictEqual({
        message: {
          attributes: {
            key1: 'value1',
            key2: 'value2',
          },
          data: 'SGVsbG8gV29ybGQh',
          messageId: '123456789012345',
          publishTime: new Date('2026-07-08T12:00:00Z'),
        },
        subscription:
          'projects/my-gcp-project/subscriptions/my-push-subscription',
      })
    })
  })
})
