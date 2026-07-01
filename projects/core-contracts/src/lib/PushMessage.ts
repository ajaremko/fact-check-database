import { Schema } from 'effect'

export const PushMessage = Schema.Struct({
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
