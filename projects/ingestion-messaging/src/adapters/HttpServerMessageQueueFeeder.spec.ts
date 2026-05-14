/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from '@effect/vitest'
import { ConfigProvider, Effect, Fiber, Layer } from 'effect'
import { HttpClient, HttpClientRequest } from '@effect/platform'
import { NodeHttpClient } from '@effect/platform-node'

import { MessageQueue } from '../MessageQueue'

import * as HttpServerMessageQueueFeeder from './HttpServerMessageQueueFeeder'
import * as InmemoryMessageQueue from './InmemoryMessageQueue'

describe('HttpServerMessageQueueFeeder', () => {
  it.effect('server returns 201 when message is received and acked', () =>
    Effect.gen(function* () {
      const server = yield* HttpServerMessageQueueFeeder.layer('/test').pipe(
        Layer.launch,
        Effect.forkDaemon
      )

      const request = yield* HttpClientRequest.post(
        'http://localhost:3000/test'
      ).pipe(
        HttpClientRequest.bodyJson({
          message: {
            data: Buffer.from('test').toString('base64'),
          },
        }),
        Effect.andThen(HttpClient.execute),
        Effect.fork
      )

      const { messages } = yield* MessageQueue
      const message = yield* messages.take
      yield* message.ack

      const response = yield* Fiber.join(request)
      yield* Fiber.interrupt(server)

      expect(response.status).toBe(201)
    }).pipe(
      Effect.provide(InmemoryMessageQueue.layer),
      Effect.provide(NodeHttpClient.layer),
      Effect.withConfigProvider(
        ConfigProvider.fromMap(new Map([['PORT', '3000']]))
      )
    )
  )
  it.effect('server returns 400 when message is received but nacked', () =>
    Effect.gen(function* () {
      const server = yield* HttpServerMessageQueueFeeder.layer('/test').pipe(
        Layer.launch,
        Effect.forkDaemon
      )

      const request = yield* HttpClientRequest.post(
        'http://localhost:3000/test'
      ).pipe(
        HttpClientRequest.bodyJson({
          message: {
            data: Buffer.from('test').toString('base64'),
          },
        }),
        Effect.andThen(HttpClient.execute),
        Effect.fork
      )

      const { messages } = yield* MessageQueue
      const message = yield* messages.take
      yield* message.nack

      const response = yield* Fiber.join(request)
      yield* Fiber.interrupt(server)

      expect(response.status).toBe(400)
    }).pipe(
      Effect.provide(InmemoryMessageQueue.layer),
      Effect.provide(NodeHttpClient.layer),
      Effect.withConfigProvider(
        ConfigProvider.fromMap(new Map([['PORT', '3000']]))
      )
    )
  )
  it.effect('massage carries through span from http request', () =>
    Effect.gen(function* () {
      const server = yield* HttpServerMessageQueueFeeder.layer('/test').pipe(
        Layer.launch,
        Effect.forkDaemon
      )

      const request = yield* HttpClientRequest.post(
        'http://localhost:3000/test'
      ).pipe(
        HttpClientRequest.bodyJson({
          message: {
            data: Buffer.from('test').toString('base64'),
          },
        }),
        Effect.andThen(HttpClient.execute),
        Effect.fork
      )

      const { messages } = yield* MessageQueue
      const message = yield* messages.take
      yield* message.ack

      yield* Fiber.join(request)
      yield* Fiber.interrupt(server)

      const span: any = message.span

      expect(span?._tag).toStrictEqual('Span')
      expect(span?.name).toStrictEqual('/test')
    }).pipe(
      Effect.provide(InmemoryMessageQueue.layer),
      Effect.provide(NodeHttpClient.layer),
      Effect.withConfigProvider(
        ConfigProvider.fromMap(new Map([['PORT', '3000']]))
      )
    )
  )
})
