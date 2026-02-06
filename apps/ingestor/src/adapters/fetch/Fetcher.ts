import { Effect, Either, Layer } from 'effect'
import {
  HttpClient,
  HttpClientError,
  HttpClientResponse,
} from '@effect/platform'

import { Fetcher, FetcherError } from '../../ports/Fetcher'
import { Response, NoResponse } from '../../domain/FetchResult'

function handleError(error: HttpClientError.HttpClientError) {
  return Effect.gen(function* () {
    switch (error._tag) {
      case 'RequestError':
        return new NoResponse({
          error: error.message,
        })
      case 'ResponseError':
        return new Response({
          status: error.response.status,
          headers: error.response.headers,
          body: yield* error.response.arrayBuffer.pipe(
            Effect.map((buffer) => new Uint8Array(buffer)),
            Effect.mapError((raw) => new FetcherError({ raw }))
          ),
          error: error.message,
        })
    }
  })
}

function handleSuccess(response: HttpClientResponse.HttpClientResponse) {
  return Effect.gen(function* () {
    return new Response({
      status: response.status,
      headers: response.headers,
      body: yield* response.arrayBuffer.pipe(
        Effect.map((buffer) => new Uint8Array(buffer)),
        Effect.mapError((raw) => new FetcherError({ raw }))
      ),
      error: null,
    })
  })
}

export const make = Effect.gen(function* () {
  const client = yield* HttpClient.HttpClient

  function fetch(url: string) {
    return Effect.gen(function* () {
      const result = yield* Effect.either(client.get(url))
      return yield* Either.match(result, {
        onLeft: handleError,
        onRight: handleSuccess,
      })
    })
  }

  return Fetcher.of({ fetch })
})

export const layer = Layer.effect(Fetcher, make)
