import { Context, Effect, ParseResult } from 'effect'

import { SanitizationAttempted } from '@news-research/ingestion/sanitize'

export interface Message {
  readonly read: Effect.Effect<SanitizationAttempted, ParseResult.ParseError>
  readonly ack: Effect.Effect<void>
}

export class MessageBatch extends Context.Tag('MessageBatch')<
  MessageBatch,
  readonly Message[]
>() {}
