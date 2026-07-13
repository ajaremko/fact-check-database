import { Effect, Layer } from 'effect'
import { HttpClient } from '@effect/platform'

import * as Node from '@news-research/core-data/Node'

import {
  Fetcher,
  FetcherError,
  FetchSuccessSchema,
  FetchFailureSchema,
} from '../ports/Fetcher'

function pickHeaders(names: string[]) {
  return function (headers: Record<string, string>) {
    for (const name of names) {
      const raw = headers[name] ?? headers[name.toLowerCase()]
      const value = raw?.trim()
      if (value) {
        return value
      }
    }
    return null
  }
}

const pickEtag = pickHeaders(['etag'])
const pickLastModified = pickHeaders(['last-modified', 'lastmodified'])
const pickContentType = pickHeaders(['content-type', 'contenttype'])

export const make = Effect.gen(function* () {
  // The base client does not follow redirects on its own; several sources
  // (feed URLs that moved) return a 301 whose body is a tiny redirect stub,
  // not the real feed, unless this is applied.
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.followRedirects()
  )
  const headers = {
    'User-Agent':
      'FactCheckDatabaseIngestor/1.0 (+https://factcheckdatabase.com)',
    Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    Connection: 'keep-alive',
  }
  return Fetcher.of({
    fetch: (source) =>
      Effect.gen(function* () {
        // Make the HTTP request using the client
        const result = yield* Effect.either(client.get(source.url, { headers }))

        // Check if the result is a success or failure and construct an
        // appropriate FetchResult
        if (result._tag === 'Left') {
          // destructure HttpClientError from result
          const error = result.left

          // Network or other request error where we have no response
          if (error._tag === 'RequestError') {
            return FetchFailureSchema.make({
              error: error.message,
            })
          }

          // Response error with a non-2xx status code with response present
          const body = yield* error.response.arrayBuffer.pipe(
            Effect.map((buffer) => new Uint8Array(buffer)),
            Effect.mapError(
              (cause) =>
                new FetcherError({
                  cause,
                  source,
                  message: 'Failed to read error response body',
                })
            )
          )

          const sha256 = yield* Node.sha256Hex(body)
          const bytes = body.byteLength

          const contentType = pickContentType(error.response.headers)
          const etag = pickEtag(error.response.headers)
          const lastModified = pickLastModified(error.response.headers)

          return FetchSuccessSchema.make({
            error: error.message,
            status: error.response.status,
            headers: error.response.headers,
            finalUrl: error.response.request.url,
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
              new FetcherError({
                cause,
                source,
                message: 'Failed to read successful response body',
              })
          )
        )

        const sha256 = yield* Node.sha256Hex(body)
        const bytes = body.byteLength

        const contentType = pickContentType(response.headers)
        const etag = pickEtag(response.headers)
        const lastModified = pickLastModified(response.headers)

        return FetchSuccessSchema.make({
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
        })
      }),
  })
})

export const layer = Layer.effect(Fetcher, make)
