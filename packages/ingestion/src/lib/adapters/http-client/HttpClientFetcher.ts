import { Effect, Layer } from 'effect'
import { HttpClient } from '@effect/platform'

import * as Fetcher from '../../steps/ingest/Fetcher'
import { FetchSuccess, FetchFailure } from '../../steps/ingest/FetchResult'
import { Node } from '../../util'

function pickHeader(headers: Record<string, string>, name: string) {
  const v = headers[name] ?? headers[name.toLowerCase()]
  return v?.trim() ? v.trim() : undefined
}

export const make = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient
  const headers = {
    'User-Agent': 'NewsResearchIngestor/1.0',
    Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    Connection: 'keep-alive',
  }
  return Fetcher.Fetcher.of({
    fetch: (sourceName, collection, url, timestamp) =>
      Effect.gen(function* () {
        // Make the HTTP request using the client
        const result = yield* Effect.either(client.get(url, { headers }))

        // Check if the result is a success or failure and construct an
        // appropriate FetchResult
        if (result._tag === 'Left') {
          // destructure HttpClientError from result
          const error = result.left

          // Network or other request error where we have no response
          if (error._tag === 'RequestError') {
            return new FetchFailure({
              error: error.message,
              url,
              source: { name: sourceName, collection },
              fetchedAt: timestamp,
            })
          }

          // Response error with a non-2xx status code with response present
          const body = yield* error.response.arrayBuffer.pipe(
            Effect.map((buffer) => new Uint8Array(buffer)),
            Effect.mapError(
              (cause) =>
                new Fetcher.FetcherError({
                  cause,
                  url: error.response.request.url,
                })
            )
          )

          const sha256 = yield* Node.sha256Hex(body)
          const bytes = body.byteLength

          const contentType = pickHeader(error.response.headers, 'content-type')
          const etag = pickHeader(error.response.headers, 'etag')
          const lastModified = pickHeader(
            error.response.headers,
            'last-modified'
          )

          return new FetchSuccess({
            error: error.message,
            source: { name: sourceName, collection },
            fetchedAt: timestamp,
            status: error.response.status,
            headers: error.response.headers,
            finalUrl: error.response.request.url,
            url,
            contentType,
            etag,
            lastModified,
            bytes,
            sha256,
            body,
          })
        }

        // Successful response with 2xx status code
        const response = result.right
        const body = yield* response.arrayBuffer.pipe(
          Effect.map((buffer) => new Uint8Array(buffer)),
          Effect.mapError(
            (cause) =>
              new Fetcher.FetcherError({ cause, url: response.request.url })
          )
        )

        const sha256 = yield* Node.sha256Hex(body)
        const bytes = body.byteLength

        const contentType = pickHeader(response.headers, 'content-type')
        const etag = pickHeader(response.headers, 'etag')
        const lastModified = pickHeader(response.headers, 'last-modified')

        return new FetchSuccess({
          status: response.status,
          headers: response.headers,
          finalUrl: response.request.url,
          fetchedAt: timestamp,
          url,
          source: { name: sourceName, collection },
          contentType,
          etag,
          lastModified,
          bytes,
          sha256,
          body,
          error: null,
        })
      }),
  })
})

export const layer = Layer.effect(Fetcher.Fetcher, make)
