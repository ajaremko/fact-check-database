import { Schema } from 'effect'

/**
 * High-level outcomes. Label is about who can access downstream.
 */
export const PolicyLabelSchema = Schema.Literal(
  'SAFE_PUBLIC',
  'RESTRICTED',
  'QUARANTINED'
)
export type PolicyLabel = Schema.Schema.Type<typeof PolicyLabelSchema>

/**
 * Traceable actions taken by the sanitizer.
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

export type SanitizationAction = Schema.Schema.Type<
  typeof SanitizationActionSchema
>

/**
 * A simple allowlist-based policy per source collection.
 * collection examples: "rss" | "api" | "html" | "csv"
 */
export const CollectionRuleSchema = Schema.Struct({
  collection: Schema.String,

  // If present, content-type must contain any of these substrings (case-insensitive).
  allowedContentTypeSubstrings: Schema.optional(Schema.Array(Schema.String)),

  // If content-type is missing, what do we do?
  onMissingContentType: Schema.optional(
    Schema.Literal('ALLOW', 'RESTRICT', 'QUARANTINE')
  ),

  // Max raw body size allowed (bytes)
  maxBytes: Schema.Number,

  // Default label if it passes gates (SAFE_PUBLIC for rss/api, RESTRICTED for html, etc.)
  defaultLabel: PolicyLabelSchema,

  // Should we rewrite body bytes for this collection? (v1: usually false)
  rewriteBody: Schema.optional(Schema.Boolean),

  // If rewriteBody is true: write sanitized bytes here; otherwise reference original raw
  // (kept in env/config, not hardcoded)
})

export type CollectionRule = Schema.Schema.Type<typeof CollectionRuleSchema>

/**
 * Optional source-specific overrides (by source name).
 * Handy for exceptions and ops.
 */
export const SourceOverrideSchema = Schema.Struct({
  sourceName: Schema.String,
  // override maxBytes / label / content-type allowlist etc.
  maxBytes: Schema.optional(Schema.Number),
  defaultLabel: Schema.optional(PolicyLabelSchema),
  allowedContentTypeSubstrings: Schema.optional(Schema.Array(Schema.String)),
  rewriteBody: Schema.optional(Schema.Boolean),
})

export type SourceOverride = Schema.Schema.Type<typeof SourceOverrideSchema>

export const SanitizerPolicySchema = Schema.Struct({
  version: Schema.Number,
  stripQueryParams: Schema.Array(Schema.String),
  dropHeaders: Schema.Array(Schema.String),
  collections: Schema.Array(CollectionRuleSchema),
  overrides: Schema.optional(Schema.Array(SourceOverrideSchema)),
})

export type SanitizerPolicy = Schema.Schema.Type<typeof SanitizerPolicySchema>
