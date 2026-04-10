import { Context, Data, Effect } from 'effect'

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
}> {}

export class Fetcher extends Context.Tag('Fetcher')<
  Fetcher,
  {
    readonly fetch: (url: string) => Effect.Effect<FetchResult, FetcherError>
  }
>() {}
