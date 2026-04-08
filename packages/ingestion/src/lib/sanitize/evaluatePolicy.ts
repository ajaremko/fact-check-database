import type {
  IngestionRecord,
  PolicyLabel,
  SanitizationAction,
} from '../data'
import type { CollectionRule, SanitizerPolicy } from './SanitizerPolicy'

export type PolicyDecision = {
  label: PolicyLabel
  actions: SanitizationAction[]
  error?: string
  rewriteBody: boolean
}

export function pickRule(
  policy: SanitizerPolicy,
  collection: string,
  sourceName: string
): CollectionRule {
  const base =
    policy.collections.find((c) => c.collection === collection) ??
    policy.collections.find((c) => c.collection === 'default') ??
    // last resort: super conservative
    ({
      collection,
      maxBytes: 1_000_000,
      defaultLabel: 'RESTRICTED',
      allowedContentTypeSubstrings: [],
      onMissingContentType: 'RESTRICT',
      rewriteBody: false,
    } as CollectionRule)

  const ov = policy.overrides?.find((o) => o.sourceName === sourceName)
  if (!ov) return base

  return {
    ...base,
    maxBytes: ov.maxBytes ?? base.maxBytes,
    defaultLabel: ov.defaultLabel ?? base.defaultLabel,
    allowedContentTypeSubstrings:
      ov.allowedContentTypeSubstrings ?? base.allowedContentTypeSubstrings,
    rewriteBody: ov.rewriteBody ?? base.rewriteBody,
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

export function evaluatePolicy(
  policy: SanitizerPolicy,
  record: IngestionRecord
): PolicyDecision {
  const actions: PolicyDecision['actions'] = []

  // Fetch failed: quarantine
  if (record.outcome !== 'data_fetched') {
    actions.push('QUARANTINED_FETCH_FAILED')
    return {
      label: 'QUARANTINED',
      actions,
      error: record.error ?? 'NoResponse',
      rewriteBody: false,
    }
  }

  const rule = pickRule(policy, record.source.collection, record.source.name)

  // Size gate
  const bytes = record.content?.bytes
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
  const ct = record.http?.contentType
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
