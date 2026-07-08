import { Context, Effect, Tracer } from 'effect'

import { MessageBody } from './MessageBody'

export interface BatchMessage {
  readonly message: MessageBody
  readonly ack: Effect.Effect<void>
  readonly span?: Tracer.AnySpan
  readonly annotations?: Record<string, unknown>
}

export class MessageBatch extends Context.Tag('MessageBatch')<
  MessageBatch,
  readonly BatchMessage[]
>() {}
