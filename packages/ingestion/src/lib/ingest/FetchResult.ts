import { Either } from 'effect'

export type NoResponse = {
  error: string
}

export type Response = {
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

export type FetchResult = Either.Either<Response, NoResponse>
