import { Clock, Effect } from 'effect'

import {
  FilePointer,
  IngestorRecord,
  SantizerRecord,
} from '@news-research/contracts'
import { Node } from '@news-research/node'

import { Archiver } from './Archiver'
import type { SanitizerPolicy, CollectionRule } from './SanitizerPolicy'

// type UrlNormalizationResult = {
//   url: string
//   actions: SantizerRecord.SanitizationAction[]
// }

// function normalizeUrl(
//   rawUrl: string,
//   stripQueryParams: string[]
// ): UrlNormalizationResult {
//   const actions: SantizerRecord.SanitizationAction[] = []
//   const u = new URL(rawUrl)

//   // remove fragment
//   if (u.hash) {
//     u.hash = ''
//     actions.push('FRAGMENT_STRIPPED')
//   }

//   // strip tracking params
//   if (u.searchParams && stripQueryParams.length > 0) {
//     const toDelete: string[] = []
//     for (const [k] of u.searchParams) {
//       const match =
//         stripQueryParams.includes(k) ||
//         stripQueryParams.some((p) => p.endsWith('_') && k.startsWith(p))
//       if (match) toDelete.push(k)
//     }
//     if (toDelete.length) {
//       toDelete.forEach((k) => u.searchParams.delete(k))
//       actions.push('QUERY_STRIPPED')
//     }
//   }

//   // normalize host casing
//   const beforeHost = u.host
//   u.host = u.host.toLowerCase()
//   if (u.host !== beforeHost) actions.push('URL_NORMALIZED')

//   return { url: u.toString(), actions }
// }

// function dropHeaders(
//   headers: Record<string, string>,
//   dropList: string[]
// ): { headers: Record<string, string>; dropped: boolean } {
//   if (dropList.length === 0) return { headers, dropped: false }

//   const drop = new Set(dropList.map((h) => h.toLowerCase()))
//   const out: Record<string, string> = {}
//   let dropped = false

//   for (const [k, v] of Object.entries(headers)) {
//     if (drop.has(k.toLowerCase())) {
//       dropped = true
//       continue
//     }
//     out[k] = v
//   }

//   return { headers: out, dropped }
// }

function pickRule(
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
    } as any)

  // apply source override (if present)
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
): { allowed: boolean; quarantineReason?: SantizerRecord.SanitizationAction } {
  const allowList = rule.allowedContentTypeSubstrings ?? []
  if (!contentType) {
    const behavior = rule.onMissingContentType ?? 'RESTRICT'
    if (behavior === 'ALLOW') return { allowed: true }
    if (behavior === 'RESTRICT') return { allowed: true } // allowed but label may be restricted elsewhere
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

type PolicyDecision = {
  label: SantizerRecord.PolicyLabel
  actions: SantizerRecord.SanitizationAction[]
  error?: string // quarantine reason text
  rewriteBody: boolean
}

function evaluatePolicy(
  policy: SanitizerPolicy,
  record: IngestorRecord.IngestionRecord
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

export function sanitizeRawObservation(
  policy: SanitizerPolicy,
  observationId: string,
  pointer: FilePointer
) {
  return Effect.gen(function* () {
    const archiver = yield* Archiver

    const record = yield* archiver.readFetchAttemptRecord(pointer)

    if (record.outcome !== 'data_fetched') {
      yield* Effect.logInfo(`Skipping observation ${observationId}`)
      return []
    }
    yield* Effect.logInfo(`Processing observation ${observationId}`)
    const decision = evaluatePolicy(policy, record)
    const sanitizationId = yield* Node.generateUUID()
    const sanitizedAt = yield* Clock.currentTimeMillis

    yield* archiver.writeSanitizerRecord(
      {
        version: 1,
        kind: 'sanitized_record',
        url: record.url,
        http: record.http,
        runId: record.runId,
        source: record.source,
        content: record.content,
        sanitizationId,
        fetchedAt: record.fetchedAt,
        sanitizedAt,
        policy: {
          label: decision.label,
          actions: decision.actions,
        },
        input: {
          record: pointer,
          raw: record.outcome === 'data_fetched' ? pointer : undefined,
        },
      },
      {
        sourceCollection: record.source.collection,
        sourceName: record.source.name,
        sanitizedAt,
        fetchedAt: record.fetchedAt,
        url: record.url,
        id: sanitizationId,
      }
    )
    return []
  }).pipe(Effect.tapError(Effect.logError))
}
