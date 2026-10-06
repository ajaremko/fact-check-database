import { describe, it, expect } from '@effect/vitest'
import { Effect, HashMap, Layer, Logger } from 'effect'

import { StorageReader } from '@fact-check-database/core-io'
import * as InMemoryStorageReader from '@fact-check-database/core-io/adapters/InMemoryStorageReader'
import * as InMemoryStorageWriter from '@fact-check-database/core-io/adapters/InMemoryStorageWriter'

import { SanitizerPolicy } from '../contracts/SanitizerPolicy'
import { SanitizerPolicyConfig } from './SanitizerPolicyConfig'

import { processMessage } from './index'

describe('processMessage', () => {
  it.effect('sanitizes the record, logs at info and acks', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []
      const outcomes: Array<string> = []
      const storage: Record<string, string> = {
        'no-response.yml': `
          version: 1
          kind: fetch_attempt
          outcome: no_response
          ingestor_run_id: 738aceb2-3212-4c1f-bcc4-3142f18396fb
          fetched_at: 1777751768896
          source:
            id: baddata
            name: baddata.com
            url: https://baddata.com/rss.xml
            collection: rss
          error: Transport error (GET https://baddata.com/rss.xml)`,
      }

      yield* processMessage({
        message: {
          data: Buffer.from(''),
          attributes: { bucketId: 'inmemory', objectId: 'no-response.yml' },
          messageId: 'message-1',
          publishTime: new Date('2026-10-01T00:00:00.000Z'),
        },
        ack: Effect.sync(() => outcomes.push('ack')),
        nack: Effect.sync(() => outcomes.push('nack')),
        annotations: {
          adapter: 'HttpServerMessageQueueFeeder',
          'message.messageId': 'message-1',
        },
      }).pipe(
        Effect.provide(
          Layer.succeed(
            SanitizerPolicyConfig,
            new SanitizerPolicy({
              version: 1,
              stripQueryParams: [],
              dropHeaders: [],
              collections: [
                {
                  collection: 'rss',
                  maxBytes: 1_000,
                  defaultLabel: 'SAFE_PUBLIC',
                  allowedContentTypeSubstrings: ['application/rss'],
                },
              ],
            })
          )
        ),
        Effect.provide(InMemoryStorageReader.layer(storage)),
        Effect.provide(InMemoryStorageWriter.layer(storage)),
        Effect.provide(
          Logger.replace(
            Logger.defaultLogger,
            Logger.make(({ logLevel, message, annotations }) => {
              logs.push({
                level: logLevel.label,
                message,
                annotations: Object.fromEntries(HashMap.toEntries(annotations)),
              })
            })
          )
        )
      )

      expect(outcomes).toStrictEqual(['ack'])
      // The feeder's `adapter` annotation is not carried onto the app's lines
      expect(logs[0]).toStrictEqual({
        level: 'INFO',
        message: ['Message received'],
        annotations: { 'message.messageId': 'message-1' },
      })
      expect(logs[1]).toMatchObject({
        level: 'INFO',
        message: ['Record sanitized'],
        annotations: { event: 'record_sanitized', 'source.id': 'baddata' },
      })
      expect(logs).toHaveLength(2)
    })
  )

  it.effect('logs one error and acks a record that cannot be parsed', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []
      const outcomes: Array<string> = []

      yield* processMessage({
        message: {
          data: Buffer.from(''),
          attributes: { bucketId: 'inmemory', objectId: 'unparseable.yml' },
          messageId: 'message-1',
          publishTime: new Date('2026-10-01T00:00:00.000Z'),
        },
        ack: Effect.sync(() => outcomes.push('ack')),
        nack: Effect.sync(() => outcomes.push('nack')),
      }).pipe(
        Effect.provide(
          Layer.succeed(
            SanitizerPolicyConfig,
            new SanitizerPolicy({
              version: 1,
              stripQueryParams: [],
              dropHeaders: [],
              collections: [],
            })
          )
        ),
        Effect.provide(
          InMemoryStorageReader.layer({ 'unparseable.yml': 'kind: [' })
        ),
        Effect.provide(InMemoryStorageWriter.layer({})),
        Effect.provide(
          Logger.replace(
            Logger.defaultLogger,
            Logger.make(({ logLevel, message, annotations }) => {
              logs.push({
                level: logLevel.label,
                message,
                annotations: Object.fromEntries(HashMap.toEntries(annotations)),
              })
            })
          )
        )
      )

      expect(outcomes).toStrictEqual(['ack'])
      expect(logs).toMatchObject([
        { level: 'INFO', message: ['Message received'] },
        {
          level: 'ERROR',
          message: ['Sanitization failed'],
          annotations: {
            'error._tag': 'ParseError',
            'message.outcome': 'ack',
            'input.object': 'unparseable.yml',
          },
        },
      ])
    })
  )

  it.effect('logs one error and nacks when the record cannot be read', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []
      const outcomes: Array<string> = []

      yield* processMessage({
        message: {
          data: Buffer.from(''),
          attributes: { bucketId: 'inmemory', objectId: 'missing.yml' },
          messageId: 'message-1',
          publishTime: new Date('2026-10-01T00:00:00.000Z'),
        },
        ack: Effect.sync(() => outcomes.push('ack')),
        nack: Effect.sync(() => outcomes.push('nack')),
      }).pipe(
        Effect.provide(
          Layer.succeed(
            SanitizerPolicyConfig,
            new SanitizerPolicy({
              version: 1,
              stripQueryParams: [],
              dropHeaders: [],
              collections: [],
            })
          )
        ),
        Effect.provide(InMemoryStorageReader.layer({})),
        Effect.provide(InMemoryStorageWriter.layer({})),
        Effect.provide(
          Logger.replace(
            Logger.defaultLogger,
            Logger.make(({ logLevel, message, annotations }) => {
              logs.push({
                level: logLevel.label,
                message,
                annotations: Object.fromEntries(HashMap.toEntries(annotations)),
              })
            })
          )
        )
      )

      expect(outcomes).toStrictEqual(['nack'])
      expect(logs).toMatchObject([
        { level: 'INFO', message: ['Message received'] },
        {
          level: 'ERROR',
          message: ['Sanitization failed'],
          annotations: {
            'error._tag': 'StorageReadError',
            'message.outcome': 'nack',
          },
        },
      ])
    })
  )

  it.effect('contains a defect to its message: logs it and nacks', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []
      const outcomes: Array<string> = []

      yield* processMessage({
        message: {
          data: Buffer.from(''),
          attributes: { bucketId: 'inmemory', objectId: 'record.yml' },
          messageId: 'message-1',
          publishTime: new Date('2026-10-01T00:00:00.000Z'),
        },
        ack: Effect.sync(() => outcomes.push('ack')),
        nack: Effect.sync(() => outcomes.push('nack')),
      }).pipe(
        Effect.provide(
          Layer.succeed(
            SanitizerPolicyConfig,
            new SanitizerPolicy({
              version: 1,
              stripQueryParams: [],
              dropHeaders: [],
              collections: [],
            })
          )
        ),
        Effect.provide(
          Layer.succeed(StorageReader, {
            read: () => Effect.die(new Error('Unexpected bug')),
          })
        ),
        Effect.provide(InMemoryStorageWriter.layer({})),
        Effect.provide(
          Logger.replace(
            Logger.defaultLogger,
            Logger.make(({ logLevel, message, annotations }) => {
              logs.push({
                level: logLevel.label,
                message,
                annotations: Object.fromEntries(HashMap.toEntries(annotations)),
              })
            })
          )
        )
      )

      expect(outcomes).toStrictEqual(['nack'])
      expect(logs).toMatchObject([
        { level: 'INFO', message: ['Message received'] },
        {
          level: 'ERROR',
          message: ['Sanitization failed'],
          annotations: { 'error._tag': 'Defect', 'message.outcome': 'nack' },
        },
      ])
    })
  )

  it.effect('logs a warning when the message is a redelivery', () =>
    Effect.gen(function* () {
      const logs: Array<{
        level: string
        message: unknown
        annotations: object
      }> = []

      yield* processMessage({
        message: {
          data: Buffer.from(''),
          attributes: { bucketId: 'inmemory', objectId: 'missing.yml' },
          messageId: 'message-1',
          publishTime: new Date('2026-10-01T00:00:00.000Z'),
          deliveryAttempt: 3,
        },
        ack: Effect.void,
        nack: Effect.void,
        annotations: { 'message.deliveryAttempt': 3 },
      }).pipe(
        Effect.provide(
          Layer.succeed(
            SanitizerPolicyConfig,
            new SanitizerPolicy({
              version: 1,
              stripQueryParams: [],
              dropHeaders: [],
              collections: [],
            })
          )
        ),
        Effect.provide(InMemoryStorageReader.layer({})),
        Effect.provide(InMemoryStorageWriter.layer({})),
        Effect.provide(
          Logger.replace(
            Logger.defaultLogger,
            Logger.make(({ logLevel, message, annotations }) => {
              logs.push({
                level: logLevel.label,
                message,
                annotations: Object.fromEntries(HashMap.toEntries(annotations)),
              })
            })
          )
        )
      )

      expect(logs).toMatchObject([
        { level: 'INFO', message: ['Message received'] },
        {
          level: 'WARN',
          message: ['Message redelivered'],
          annotations: { 'message.deliveryAttempt': 3 },
        },
        { level: 'ERROR', message: ['Sanitization failed'] },
      ])
    })
  )
})
