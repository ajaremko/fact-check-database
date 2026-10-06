import { Schema } from 'effect'

/**
 * High-level access classification assigned to each sanitized record.
 * Determines who may access the record downstream:
 * - `SAFE_PUBLIC` — suitable for unrestricted downstream access
 * - `RESTRICTED` — requires access controls before use
 * - `QUARANTINED` — withheld from downstream use pending review
 */
export const PolicyLabelSchema = Schema.Literal(
  'SAFE_PUBLIC',
  'RESTRICTED',
  'QUARANTINED'
)

/** High-level access classification assigned to each sanitized record. */
export type PolicyLabel = Schema.Schema.Type<typeof PolicyLabelSchema>

/**
 * A simple allowlist-based policy per source collection.
 * collection examples: "rss" | "api" | "html" | "csv"
 */
export const CollectionRuleSchema = Schema.Struct({
  collection: Schema.String,

  // If present, content-type must contain any of these substrings (case-insensitive).
  allowedContentTypeSubstrings: Schema.optional(Schema.Array(Schema.String)),

  // What to do with a response that has no content-type. QUARANTINE (the
  // default) quarantines it, RESTRICT labels it RESTRICTED, and ALLOW applies
  // `defaultLabel` as if the content-type had matched.
  onMissingContentType: Schema.optional(
    Schema.Literal('ALLOW', 'RESTRICT', 'QUARANTINE')
  ),

  // Max raw body size allowed (bytes)
  maxBytes: Schema.Number,

  // Default label if it passes gates (SAFE_PUBLIC for rss/api, RESTRICTED for html, etc.)
  defaultLabel: PolicyLabelSchema,

  // Should the body be rewritten for this collection? When true, the policy's
  // `stripQueryParams` are removed from every URL in a body that passes the
  // gates above, and a body that changed is archived as a sanitized copy.
  // When false or absent, records point at the raw body.
  rewriteBody: Schema.optional(Schema.Boolean),
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

export class SanitizerPolicy extends Schema.Class<SanitizerPolicy>(
  'SanitizerPolicy'
)({
  // The policy's revision. It is written to every sanitizer record as
  // `policy_version` and carried into staging and curated rows, so a record
  // can be traced to the rules that produced it. Raise it with any change to
  // the values below: see "Changing the policy" in docs/runbook.md.
  version: Schema.Number,
  // Query parameters removed from URLs: a parameter name, or a prefix when
  // the entry ends in `_` (`utm_` matches `utm_source`). Case-insensitive.
  // Together with `rewriteBody`, this is part of how fact checks are
  // identified: see "Changing the policy" in docs/runbook.md.
  stripQueryParams: Schema.Array(Schema.String),
  // Response headers removed from every record. Case-insensitive names.
  dropHeaders: Schema.Array(Schema.String),
  collections: Schema.Array(CollectionRuleSchema),
  overrides: Schema.optional(Schema.Array(SourceOverrideSchema)),
}) {}
