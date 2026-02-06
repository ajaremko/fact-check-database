import { createHash } from 'node:crypto'

import type { ArchivePointer, ObservationFetched } from './Observation'

/**
 * Inputs you likely have at the point you create the event.
 * Keep this helper pure: no I/O, no env lookups.
 */
export type CreateObservationFetchedArgs = {
  runId: string
  fetchedAt: number

  url: string
  finalUrl?: string

  sourceName: string
  sourceCollection: string

  status: number
  headers: Record<string, string | string[] | undefined>

  body: Uint8Array | ArrayBuffer

  archive: ArchivePointer

  // If fetch failed, pass an error string. If successful, leave undefined.
  error?: string
}

/** Normalize headers to a lower-case string->string map. */
function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    if (v === undefined) continue
    const key = k.toLowerCase()
    out[key] = Array.isArray(v) ? v.join(', ') : v
  }
  return out
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function sha256HexString(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex')
}

function toUint8Array(body: Uint8Array | ArrayBuffer): Uint8Array {
  return body instanceof Uint8Array ? body : new Uint8Array(body)
}

/**
 * Create a stable ID for the observation event.
 *
 * Rationale:
 * - We want at-least-once safe dedupe downstream.
 * - We include url + fetchedAt + content hash when available.
 * - If fetch failed (no body), we include url + fetchedAt + status + error.
 */
function computeObservationId(args: {
  url: string
  fetchedAtIso: string
  status: number
  contentSha256?: string
  error?: string
}): string {
  const base = args.contentSha256
    ? `v1|url=${args.url}|t=${args.fetchedAtIso}|sha256=${args.contentSha256}`
    : `v1|url=${args.url}|t=${args.fetchedAtIso}|status=${args.status}|error=${
        args.error ?? ''
      }`

  return sha256HexString(base)
}

/**
 * A small helper: keep parsing forgiving.
 */
function pickHeader(
  h: Record<string, string>,
  name: string
): string | undefined {
  const v = h[name.toLowerCase()]
  return v && v.trim().length > 0 ? v.trim() : undefined
}

export function createObservationFetched(
  args: CreateObservationFetchedArgs
): ObservationFetched {
  const headers = normalizeHeaders(args.headers)
  const bodyBytes = toUint8Array(args.body)

  const fetchedAtIso = new Date(args.fetchedAt).toISOString()

  const contentType = pickHeader(headers, 'content-type')
  const etag = pickHeader(headers, 'etag')
  const lastModified = pickHeader(headers, 'last-modified')

  // Only hash if we actually have a body; for failures you might have empty bytes.
  const hasBody = bodyBytes.byteLength > 0
  const contentSha256 = hasBody ? sha256Hex(bodyBytes) : undefined

  const observationId = computeObservationId({
    url: args.url,
    fetchedAtIso,
    status: args.status,
    contentSha256,
    error: args.error,
  })

  const event: ObservationFetched = {
    observationId,
    runId: args.runId,
    fetchedAt: args.fetchedAt,

    url: args.url,
    finalUrl: args.finalUrl,

    source: {
      name: args.sourceName,
      collection: args.sourceCollection,
    },

    http: {
      status: args.status,
      contentType,
      etag,
      lastModified,
    },

    content: {
      sha256: contentSha256,
      bytes: hasBody ? bodyBytes.byteLength : undefined,
    },

    archive: args.archive,

    error: args.error,
  }

  return event
}
