import { SourceConfig } from '@fact-check-database/ingestion-contracts/config/v1'

import type {
  CollectionRule,
  SanitizerPolicy,
} from '../contracts/SanitizerPolicy'
import type { SanitizationAction, PolicyDecision } from './PolicyDecision'
import type { Observation } from './Observation'

const collectionRuleDefaults: Partial<CollectionRule> = {
  defaultLabel: 'RESTRICTED',
  allowedContentTypeSubstrings: [],
  onMissingContentType: 'QUARANTINE',
  rewriteBody: false,
}

export function pickRule(
  policy: SanitizerPolicy,
  source: Pick<SourceConfig, 'collection' | 'name'>
): CollectionRule {
  const base =
    policy.collections.find((c) => c.collection === source.collection) ??
    policy.collections.find((c) => c.collection === 'default') ??
    // last resort: super conservative
    ({
      ...collectionRuleDefaults,
      collection: source.collection,
      maxBytes: 1_000_000,
    } as CollectionRule)

  const ov = policy.overrides?.find((o) => o.sourceName === source.name)
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
    onMissingContentType: base.onMissingContentType ?? 'QUARANTINE',
  }
}

/** What the content-type gate decides for a record. */
type ContentTypeOutcome = 'ALLOW' | 'RESTRICT' | 'QUARANTINE'

function checkContentType(
  contentType: string | null,
  rule: CollectionRule
): ContentTypeOutcome {
  // A response that doesn't say what it is: the rule chooses, and by default
  // the record is quarantined rather than passed on.
  if (!contentType) return rule.onMissingContentType ?? 'QUARANTINE'

  const allowList = rule.allowedContentTypeSubstrings ?? []
  if (allowList.length === 0) return 'ALLOW'

  const ct = contentType.toLowerCase()
  return allowList.some((s) => ct.includes(s.toLowerCase()))
    ? 'ALLOW'
    : 'QUARANTINE'
}

export function evaluatePolicy(
  policy: SanitizerPolicy,
  observation: Observation
): PolicyDecision {
  const actions: SanitizationAction[] = []

  // Fetch failed: quarantine
  if (!observation.raw) {
    actions.push('QUARANTINED_FETCH_FAILED')
    return {
      label: 'QUARANTINED',
      actions,
      error: null,
      rewriteBody: false,
    }
  }

  const rule = pickRule(policy, observation.source)

  // Empty-body gate: a 0-byte body (e.g. an unfollowed HTTP redirect that
  // inherited the target's content-type header) can otherwise pass every
  // other gate and be labeled safe, then silently extract nothing.
  const bytes = observation.raw.content?.bytes
  if (bytes === 0) {
    actions.push('QUARANTINED_EMPTY_BODY')
    return {
      label: 'QUARANTINED',
      actions,
      error: 'Empty response body',
      rewriteBody: false,
    }
  }

  // Size gate
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
  const ct = observation.raw.http?.contentType
  const ctCheck = checkContentType(ct, rule)
  if (ctCheck === 'QUARANTINE') {
    actions.push('QUARANTINED_UNEXPECTED_CONTENT_TYPE')
    return {
      label: 'QUARANTINED',
      actions,
      error: `Unexpected content-type: ${ct ?? 'missing'}`,
      rewriteBody: false,
    }
  }

  // Pass. A missing content type the rule chose to restrict keeps the record
  // out of the safe label, with the reason stated. It never loosens a label
  // the rule already restricts.
  const restricted = ctCheck === 'RESTRICT'
  return {
    label:
      restricted && rule.defaultLabel === 'SAFE_PUBLIC'
        ? 'RESTRICTED'
        : rule.defaultLabel,
    actions,
    error: restricted ? 'Missing content-type' : null,
    rewriteBody: rule.rewriteBody ?? false,
  }
}
