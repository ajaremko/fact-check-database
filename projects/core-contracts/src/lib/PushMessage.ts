import { Schema } from 'effect'

import * as Node from '@news-research/core-data/Node'

export const PushMessage = Schema.Struct({
  message: Schema.Struct({
    data: Schema.String.pipe(
      Node.parseBufferEncoded({ decode: 'utf-8', encode: 'base64' })
    ),
    attributes: Schema.optional(
      Schema.Record({ key: Schema.String, value: Schema.String })
    ),
    messageId: Schema.String,
    publishTime: Schema.DateFromString,
  }),
  subscription: Schema.String,
})
