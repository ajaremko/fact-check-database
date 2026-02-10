// domain/normalize.ts
import { createHash } from 'node:crypto'
import { isResponse } from './FetchResult'
import type { FetchResult } from './FetchResult'
import type { FetchAttempt } from './FetchAttempt'

export function pickHeader(headers: Record<string, string>, name: string) {
  const v = headers[name] ?? headers[name.toLowerCase()]
  return v?.trim() ? v.trim() : undefined
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export function observationIdFrom(args: {
  url: string
  fetchedAt: number
  sha256?: string
  status?: number
  error?: string
}) {
  const base = args.sha256
    ? `v1|url=${args.url}|sha256=${args.sha256}`
    : `v1|url=${args.url}|t=${args.fetchedAt}|status=${
        args.status ?? 'na'
      }|error=${args.error ?? ''}`
  return createHash('sha256').update(base, 'utf8').digest('hex')
}

export function normalizeFetchAttempt(input: {
  runId: string
  sourceName: string
  sourceCollection: string
  url: string
  finalUrl?: string
  fetchedAt: number
  result: FetchResult
}): FetchAttempt {
  const {
    runId,
    sourceName,
    sourceCollection,
    url,
    finalUrl,
    fetchedAt,
    result,
  } = input

  if (!isResponse(result)) {
    return {
      _tag: 'NoResponse',
      runId,
      sourceName,
      sourceCollection,
      url,
      finalUrl,
      fetchedAt,
      error: result.error,
    }
  }

  const contentType = pickHeader(result.headers, 'content-type')
  const etag = pickHeader(result.headers, 'etag')
  const lastModified = pickHeader(result.headers, 'last-modified')

  const bytes = result.body.byteLength
  const sha256 = sha256Hex(result.body)

  return {
    _tag: 'Fetched',
    runId,
    sourceName,
    sourceCollection,
    url,
    finalUrl,
    fetchedAt,
    http: {
      status: result.status,
      contentType,
      etag,
      lastModified,
      headers: result.headers,
    },
    content: { sha256, bytes },
    body: result.body,
  }
}
