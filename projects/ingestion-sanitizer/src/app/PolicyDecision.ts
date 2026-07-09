import { Schema } from 'effect'

import { PolicyLabelSchema } from '../contracts/SanitizerPolicy'

/**
 * Traceable actions applied by the sanitizer. Multiple actions may be recorded
 * per record; the full list forms an append-only audit trail of modifications.
 */
export const SanitizationActionSchema = Schema.Literal(
  'NONE',
  'URL_NORMALIZED',
  'QUERY_STRIPPED',
  'FRAGMENT_STRIPPED',
  'DROPPED_HEADERS',
  'BODY_STRIPPED',
  'BODY_REWRITTEN',
  'QUARANTINED_TOO_LARGE',
  'QUARANTINED_UNEXPECTED_CONTENT_TYPE',
  'QUARANTINED_FETCH_FAILED'
)

/** Actions applied by the sanitizer to a record. */
export type SanitizationAction = Schema.Schema.Type<
  typeof SanitizationActionSchema
>

export const PolicyDecisionSchema = Schema.Struct({
  label: PolicyLabelSchema,
  actions: Schema.Array(SanitizationActionSchema),
  error: Schema.NullOr(Schema.String),
  rewriteBody: Schema.Boolean,
})

export type PolicyDecision = Schema.Schema.Type<typeof PolicyDecisionSchema>
