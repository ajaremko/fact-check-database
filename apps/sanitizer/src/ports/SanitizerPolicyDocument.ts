import { Context, Data, Effect } from 'effect'

import type { SanitizerPolicy } from '@news-research/ingestion/sanitize'

export class SanitizerPolicyDocumentError extends Data.TaggedError(
  'SanitizerPolicyDocumentError'
)<{
  readonly cause: unknown
}> {}

export class SanitizerPolicyDocument extends Context.Tag(
  'SanitizerPolicyDocument'
)<
  SanitizerPolicyDocument,
  {
    readonly read: Effect.Effect<SanitizerPolicy, SanitizerPolicyDocumentError>
  }
>() {}
