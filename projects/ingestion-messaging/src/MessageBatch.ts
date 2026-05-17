import { Context, Effect, Tracer } from 'effect'

export interface BatchMessage {
  readonly data: Buffer
  readonly ack: Effect.Effect<void>
  readonly span?: Tracer.AnySpan
  readonly annotations?: Record<string, unknown>
}

export class MessageBatch extends Context.Tag('MessageBatch')<
  MessageBatch,
  readonly BatchMessage[]
>() {}
