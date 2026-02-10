// domain/FetchAttempt.ts
export type HttpMeta = {
  status: number
  contentType?: string
  etag?: string
  lastModified?: string
  headers: Record<string, string> // optional: keep full headers here
}

export type ContentMeta = {
  sha256?: string
  bytes?: number
}

export type FetchSuccess = {
  _tag: 'Fetched'
  runId: string
  sourceName: string
  sourceCollection: string
  url: string
  finalUrl?: string
  fetchedAt: number
  http: HttpMeta
  content: ContentMeta
  body: Uint8Array // present only here
}

export type FetchFailure = {
  _tag: 'NoResponse'
  runId: string
  sourceName: string
  sourceCollection: string
  url: string
  finalUrl?: string
  fetchedAt: number
  error: string
}

export type FetchAttempt = FetchSuccess | FetchFailure
