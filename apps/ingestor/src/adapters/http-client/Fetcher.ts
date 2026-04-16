import { Effect, Either, Layer } from 'effect'
import {
  HttpClient,
  HttpClientError,
  HttpClientResponse,
} from '@effect/platform'

import {
  Fetcher,
  FetcherError,
  FetchResult,
  SourceTarget,
} from '../../../../../packages/ingestion/dist/lib/steps/ingest'
import { Node } from '@news-research/ingestion/util'

function handleRequestError(
  error: HttpClientError.RequestError
): Effect.Effect<FetchResult, FetcherError> {
  return Effect.succeed({
    type: 'failure',
    error: error.message,
  })
}

function pickHeader(headers: Record<string, string>, name: string) {
  const v = headers[name] ?? headers[name.toLowerCase()]
  return v?.trim() ? v.trim() : undefined
}

function handleResponseError(
  error: HttpClientError.ResponseError
): Effect.Effect<FetchResult, FetcherError> {
  return Effect.gen(function* () {
    const body = yield* error.response.arrayBuffer.pipe(
      Effect.map((buffer) => new Uint8Array(buffer)),
      Effect.mapError(
        (cause) => new FetcherError({ cause, url: error.response.request.url })
      )
    )
    const sha256 = yield* Node.sha256Hex(body)
    const bytes = body.byteLength

    const contentType = pickHeader(error.response.headers, 'content-type')
    const etag = pickHeader(error.response.headers, 'etag')
    const lastModified = pickHeader(error.response.headers, 'last-modified')

    return {
      type: 'failure',
      status: error.response.status,
      headers: error.response.headers,
      finalUrl: error.response.request.url,
      contentType,
      etag,
      lastModified,
      bytes,
      sha256,
      body,
      error: error.message,
    }
  })
}

function handleError(error: HttpClientError.HttpClientError) {
  switch (error._tag) {
    case 'RequestError':
      return handleRequestError(error)
    case 'ResponseError':
      return handleResponseError(error)
  }
}

function handleSuccess(
  response: HttpClientResponse.HttpClientResponse
): Effect.Effect<FetchResult, FetcherError> {
  return Effect.gen(function* () {
    const body = yield* response.arrayBuffer.pipe(
      Effect.map((buffer) => new Uint8Array(buffer)),
      Effect.mapError(
        (cause) => new FetcherError({ cause, url: response.request.url })
      )
    )

    const sha256 = yield* Node.sha256Hex(body)
    const bytes = body.byteLength

    const contentType = pickHeader(response.headers, 'content-type')
    const etag = pickHeader(response.headers, 'etag')
    const lastModified = pickHeader(response.headers, 'last-modified')

    return {
      type: 'success',
      status: response.status,
      headers: response.headers,
      finalUrl: response.request.url,
      contentType,
      etag,
      lastModified,
      bytes,
      sha256,
      body,
      error: null,
    }
  })
}

const toResult = Either.match({
  onLeft: handleError,
  onRight: handleSuccess,
})

export const make = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient

  function fetch(source: SourceTarget) {
    return Effect.gen(function* () {
      const either = yield* Effect.either(
        client.get(source.url, {
          headers: {
            'User-Agent': 'NewsResearchIngestor/1.0',
            Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            Connection: 'keep-alive',
          },
        })
      )
      return yield* toResult(either)
    })
  }

  return Fetcher.of({ fetch })
})

export const layer = Layer.effect(Fetcher, make)
