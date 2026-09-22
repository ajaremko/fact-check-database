import { Schema } from 'effect'

import * as Node from '@fact-check-database/core-data/Node'

/**
 * Payload of a Pub/Sub message delivered via HTTP push subscription.
 *
 * - `data` is the message body exactly as Pub/Sub delivers it: a base64-encoded
 * string. Pipe {@link parsePubsubMessagePayloadData} in front of a body schema
 * to decode it.
 * - `attributes` carries the publisher-set
 *   key/value pairs.
 * - `publishTime` is decoded from its RFC 3339 string form into a `Date`.
 *
 * @example
 * const decodeEnvelope = Schema.decodeUnknown(PubsubMessageEnvelope)
 * const { message } = yield* decodeEnvelope(requestBody)
 * // message.messageId    → "123456789012345"
 * // message.publishTime  → Date
 * // message.data         → "SGVsbG8gV29ybGQh"   (still base64)
 */
export const PubsubMessagePayload = Schema.Struct({
  data: Schema.String,
  attributes: Schema.optional(
    Schema.Record({ key: Schema.String, value: Schema.String })
  ),
  messageId: Schema.String,
  publishTime: Schema.DateFromString,
})

export type PubsubMessagePayload = Schema.Schema.Type<
  typeof PubsubMessagePayload
>

/**
 * The JSON body Pub/Sub POSTs to a push subscription endpoint.
 *
 * Decode the request body with this schema before looking at the message
 * inside. `subscription` is the fully qualified subscription resource name,
 * useful for logging and for rejecting deliveries from an unexpected
 * subscription.
 * @example
 * // A decoded envelope
 * {
 *   message: {
 *     data: 'SGVsbG8gV29ybGQh',
 *     attributes: { bucketId: 'core-staging-bucket', objectId: 'v1/type=fact_checks/...' },
 *     messageId: '123456789012345',
 *     publishTime: new Date('2026-07-08T12:00:00Z'),
 *   },
 *   subscription: 'projects/my-gcp-project/subscriptions/my-push-subscription',
 * }
 */
export const PubsubMessageEnvelope = Schema.Struct({
  message: PubsubMessagePayload,
  subscription: Schema.String,
})

export type PubsubMessageEnvelope = Schema.Schema.Type<
  typeof PubsubMessageEnvelope
>

/**
 * Schema combinator that decodes the base64 `data` field of a Pub/Sub message
 * into a UTF-8 string, and encodes a string back to base64.
 *
 * It composes with any body schema via `pipe`.
 *
 * @example
 * const decodeBody = Schema.String.pipe(
 *   parsePubsubMessagePayloadData,
 *   Schema.decodeUnknown
 * )
 * yield* decodeBody('SGVsbG8gV29ybGQh') // → "Hello World!"
 *
 * @example
 * // Decode straight into a typed record
 * const decodeRecord = MyRecordSchema.pipe(
 *   Node.parseJson(),
 *   parsePubsubMessagePayloadData,
 *   Schema.decodeUnknown
 * )
 */
export const parsePubsubMessagePayloadData = Node.parseBufferEncoded({
  decode: 'utf-8',
  encode: 'base64',
})
