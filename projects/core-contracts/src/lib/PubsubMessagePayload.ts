import { Schema } from 'effect'

import * as Node from '@news-research/core-data/Node'

export const PubsubMessagePayload = Schema.Struct({
  message: Schema.Struct({
    data: Schema.String,
    attributes: Schema.optional(
      Schema.Record({ key: Schema.String, value: Schema.String })
    ),
    messageId: Schema.String,
    publishTime: Schema.DateFromString,
  }),
  subscription: Schema.String,
})

export const parsePubsubMessagePayloadData = Node.parseBufferEncoded({
  decode: 'utf-8',
  encode: 'base64',
})
