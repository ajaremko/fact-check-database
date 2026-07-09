import { Schema } from 'effect'

import * as Node from '@news-research/core-data/Node'

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

export const PubsubMessageEnvelope = Schema.Struct({
  message: PubsubMessagePayload,
  subscription: Schema.String,
})

export type PubsubMessageEnvelope = Schema.Schema.Type<
  typeof PubsubMessageEnvelope
>

export const parsePubsubMessagePayloadData = Node.parseBufferEncoded({
  decode: 'utf-8',
  encode: 'base64',
})
