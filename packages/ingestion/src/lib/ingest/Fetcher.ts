import { Context, Data, Effect } from 'effect'

import { SourceTarget } from './SourceTarget'

export type FetchFailure = {
  type: 'failure'
  error: string
}

export type FetchSuccess = {
  type: 'success'
  finalUrl: string
  status: number
  headers: Record<string, string>
  etag?: string
  lastModified?: string
  contentType?: string
  bytes: number
  sha256: string
  body: Uint8Array
  error: string | null
}

export type FetchResult = FetchSuccess | FetchFailure

export class FetcherError extends Data.TaggedError('FetcherError')<{
  readonly cause: unknown
  readonly url: string
}> {}

export class Fetcher extends Context.Tag('Fetcher')<
  Fetcher,
  {
    readonly fetch: (
      source: SourceTarget
    ) => Effect.Effect<FetchResult, FetcherError>
  }
>() {}
