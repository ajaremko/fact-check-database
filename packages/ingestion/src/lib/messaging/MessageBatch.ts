import { Context, Effect } from 'effect'

export interface Message {
  readonly data: Buffer
  readonly ack: Effect.Effect<void>
}

export class MessageBatch extends Context.Tag('MessageBatch')<
  MessageBatch,
  readonly Message[]
>() {}
