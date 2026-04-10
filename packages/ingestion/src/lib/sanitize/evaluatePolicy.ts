import type { IngestionRecord, PolicyLabel, SanitizationAction } from '../data'

import type { CollectionRule, SanitizerPolicy } from './SanitizerPolicy'

export type PolicyDecision = {
  label: PolicyLabel
  actions: SanitizationAction[]
  error?: string
  rewriteBody: boolean
}

const collectionRuleDefaults: Partial<CollectionRule> = {
  defaultLabel: 'RESTRICTED',
  allowedContentTypeSubstrings: [],
  onMissingContentType: 'RESTRICT',
  rewriteBody: false,
}

export function pickRule(input: {
  policy: SanitizerPolicy
  source: {
    collection: string
    name: string
  }
}): CollectionRule {
  const base =
    input.policy.collections.find(
      (c) => c.collection === input.source.collection
    ) ??
    input.policy.collections.find((c) => c.collection === 'default') ??
    // last resort: super conservative
    ({
      ...collectionRuleDefaults,
      collection: input.source.collection,
      maxBytes: 1_000_000,
    } as CollectionRule)

  const ov = input.policy.overrides?.find(
    (o) => o.sourceName === input.source.name
  )
  if (!ov) return { ...collectionRuleDefaults, ...base }

  return {
    ...collectionRuleDefaults,
    ...base,
    maxBytes: ov.maxBytes ?? base.maxBytes,
    defaultLabel: ov.defaultLabel ?? base.defaultLabel,
    allowedContentTypeSubstrings:
      ov.allowedContentTypeSubstrings ??
      base.allowedContentTypeSubstrings ??
      [],
    rewriteBody: ov.rewriteBody ?? base.rewriteBody ?? false,
    onMissingContentType: base.onMissingContentType ?? 'RESTRICT',
  }
}

function contentTypeAllowed(
  contentType: string | undefined,
  rule: CollectionRule
): { allowed: boolean; quarantineReason?: SanitizationAction } {
  const allowList = rule.allowedContentTypeSubstrings ?? []
  if (!contentType) {
    const behavior = rule.onMissingContentType ?? 'RESTRICT'
    if (behavior === 'ALLOW') return { allowed: true }
    if (behavior === 'RESTRICT') return { allowed: true }
    return {
      allowed: false,
      quarantineReason: 'QUARANTINED_UNEXPECTED_CONTENT_TYPE',
    }
  }

  if (allowList.length === 0) return { allowed: true }

  const ct = contentType.toLowerCase()
  const ok = allowList.some((s) => ct.includes(s.toLowerCase()))
  return ok
    ? { allowed: true }
    : {
        allowed: false,
        quarantineReason: 'QUARANTINED_UNEXPECTED_CONTENT_TYPE',
      }
}

export function evaluatePolicy(input: {
  policy: SanitizerPolicy
  record: IngestionRecord
}): PolicyDecision {
  const actions: PolicyDecision['actions'] = []

  // Fetch failed: quarantine
  if (input.record.outcome !== 'data_fetched') {
    actions.push('QUARANTINED_FETCH_FAILED')
    return {
      label: 'QUARANTINED',
      actions,
      error: input.record.error ?? 'NoResponse',
      rewriteBody: false,
    }
  }

  const rule = pickRule({ policy: input.policy, source: input.record.source })

  // Size gate
  const bytes = input.record.content?.bytes
  if (typeof bytes === 'number' && bytes > rule.maxBytes) {
    actions.push('QUARANTINED_TOO_LARGE')
    return {
      label: 'QUARANTINED',
      actions,
      error: `Body too large: ${bytes} > ${rule.maxBytes}`,
      rewriteBody: false,
    }
  }

  // Content-type gate
  const ct = input.record.http?.contentType
  const ctCheck = contentTypeAllowed(ct, rule)
  if (!ctCheck.allowed) {
    actions.push(
      ctCheck.quarantineReason ?? 'QUARANTINED_UNEXPECTED_CONTENT_TYPE'
    )
    return {
      label: 'QUARANTINED',
      actions,
      error: `Unexpected content-type: ${ct ?? 'missing'}`,
      rewriteBody: false,
    }
  }

  // Pass
  return {
    label: rule.defaultLabel,
    actions,
    rewriteBody: rule.rewriteBody ?? false,
  }
}
