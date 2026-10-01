import { describe, it, expect } from '@effect/vitest'
import { Effect, HashMap, Logger } from 'effect'

import * as InMemoryStorageWriter from '@fact-check-database/core-io/adapters/InMemoryStorageWriter'

import * as InMemoryFetcher from '../adapters/InMemoryFetcher'

import { FetchFailureSchema, FetchSuccessSchema } from '../ports/Fetcher'
import { ingestFromSource } from './ingestFromSource'

describe('ingestFromSourceTarget', () => {
  it.effect(
    'when fetch is unsuccessful, returns IngestionAttempted event, writes records to archive',
    () =>
      Effect.gen(function* () {
        const storage = {}
        const logs: Array<{
          level: string
          message: unknown
          annotations: object
        }> = []
        const result = yield* ingestFromSource({
          ingestorRunId: 'run-1',
          timestamp: 0,
          source: {
            id: 'baddata',
            name: 'baddata.com',
            url: 'https://baddata.com/rss.xml',
            collection: 'rss',
          },
        }).pipe(
          Effect.provide(
            InMemoryFetcher.layer(
              FetchFailureSchema.make({
                error: 'Transport error (GET https://baddata.com/rss.xml)',
              })
            )
          ),
          Effect.provide(InMemoryStorageWriter.layer(storage)),
          Effect.provide(
            Logger.replace(
              Logger.defaultLogger,
              Logger.make(({ logLevel, message, annotations }) => {
                logs.push({
                  level: logLevel.label,
                  message,
                  annotations: Object.fromEntries(
                    HashMap.toEntries(annotations)
                  ),
                })
              })
            )
          )
        )

        expect(result).toStrictEqual({
          bucket: 'inmemory',
          object:
            'v1/records/ingestion/source=baddata/date=1970-01-01/ingestor_run_id=run-1/fetch_attempt.yml',
        })

        expect(
          Object.keys(storage).filter((key) => key.startsWith('v1/raw/'))
        ).toEqual([])
        expect(storage).toHaveProperty(
          'v1/records/ingestion/source=baddata/date=1970-01-01/ingestor_run_id=run-1/fetch_attempt.yml'
        )
        expect(logs).toStrictEqual([
          {
            level: 'WARN',
            message: ['Source unreachable'],
            annotations: {
              'record.object':
                'v1/records/ingestion/source=baddata/date=1970-01-01/ingestor_run_id=run-1/fetch_attempt.yml',
              event: 'fetch_failure',
              'result.error':
                'Transport error (GET https://baddata.com/rss.xml)',
            },
          },
        ])
      })
  )
  it.effect(
    'when fetch is successful, returns IngestionAttempted event, writes records and bin to archive',
    () =>
      Effect.gen(function* () {
        const storage = {}
        const logs: Array<{
          level: string
          message: unknown
          annotations: object
        }> = []

        const result = yield* ingestFromSource({
          ingestorRunId: 'run-1',
          timestamp: 0,
          source: {
            id: 'politifact',
            name: 'politifact.com',
            url: 'https://www.politifact.com/rss/all/',
            collection: 'rss',
          },
        }).pipe(
          Effect.provide(
            InMemoryFetcher.layer(
              FetchSuccessSchema.make({
                finalUrl: 'https://www.politifact.com/rss/all/',
                status: 200,
                headers: {
                  date: 'Wed, 29 Apr 2026 20:35:08 GMT',
                  'content-type': 'application/rss+xml; charset=utf-8',
                  'content-length': '10648',
                  connection: 'keep-alive',
                  'last-modified': 'Wed, 29 Apr 2026 16:20:04 GMT',
                  'cache-control': 'public, max-age=3600',
                  ETag: '33a64df551425fcc55e4d42a148795d9f25f89d4',
                },
                contentType: 'application/rss+xml; charset=utf-8',
                etag: '33a64df551425fcc55e4d42a148795d9f25f89d4',
                lastModified: 'Wed, 29 Apr 2026 16:20:04 GMT',
                bytes: 10648,
                sha256:
                  '311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6',
                body: new Uint8Array(),
                error: null,
              })
            )
          ),
          Effect.provide(InMemoryStorageWriter.layer(storage)),
          Effect.provide(
            Logger.replace(
              Logger.defaultLogger,
              Logger.make(({ logLevel, message, annotations }) => {
                logs.push({
                  level: logLevel.label,
                  message,
                  annotations: Object.fromEntries(
                    HashMap.toEntries(annotations)
                  ),
                })
              })
            )
          )
        )

        expect(result).toStrictEqual({
          bucket: 'inmemory',
          object:
            'v1/records/ingestion/source=politifact/date=1970-01-01/ingestor_run_id=run-1/fetch_attempt.yml',
        })

        expect(storage).toHaveProperty(
          'v1/raw/source=politifact/date=1970-01-01/ingestor_run_id=run-1/311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6.bin'
        )
        expect(storage).toHaveProperty(
          'v1/records/ingestion/source=politifact/date=1970-01-01/ingestor_run_id=run-1/fetch_attempt.yml'
        )
        expect(logs).toStrictEqual([
          {
            level: 'INFO',
            message: ['Source fetched'],
            annotations: {
              'content.bytes': 10648,
              'content.sha256':
                '311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6',
              'result.final_url': 'https://www.politifact.com/rss/all/',
              'body.object':
                'v1/raw/source=politifact/date=1970-01-01/ingestor_run_id=run-1/311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6.bin',
              'record.object':
                'v1/records/ingestion/source=politifact/date=1970-01-01/ingestor_run_id=run-1/fetch_attempt.yml',
              event: 'fetch_success',
              'result.status': 'OK',
              'result.status_code': 200,
              'result.content_type': 'application/rss+xml; charset=utf-8',
            },
          },
        ])
      })
  )

  it.effect(
    'when fetch is successful with null optional fields, omits content_type, etag, last_modified from event',
    () =>
      Effect.gen(function* () {
        const storage = {}
        const logs: Array<{
          level: string
          message: unknown
          annotations: object
        }> = []

        const result = yield* ingestFromSource({
          ingestorRunId: 'run-1',
          timestamp: 0,
          source: {
            id: 'politifact',
            name: 'politifact.com',
            url: 'https://www.politifact.com/rss/all/',
            collection: 'rss',
          },
        }).pipe(
          Effect.provide(
            InMemoryFetcher.layer(
              FetchSuccessSchema.make({
                finalUrl: 'https://www.politifact.com/rss/all/',
                status: 200,
                headers: {},
                contentType: null,
                etag: null,
                lastModified: null,
                bytes: 10648,
                sha256:
                  '311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6',
                body: new Uint8Array(),
                error: null,
              })
            )
          ),
          Effect.provide(InMemoryStorageWriter.layer(storage)),
          Effect.provide(
            Logger.replace(
              Logger.defaultLogger,
              Logger.make(({ logLevel, message, annotations }) => {
                logs.push({
                  level: logLevel.label,
                  message,
                  annotations: Object.fromEntries(
                    HashMap.toEntries(annotations)
                  ),
                })
              })
            )
          )
        )

        expect(result).not.toHaveProperty('content_type')
        expect(result).not.toHaveProperty('etag')
        expect(result).not.toHaveProperty('last_modified')

        expect(Object.keys(storage).some((k) => k.includes('/raw/'))).toBe(true)
        expect(Object.keys(storage).some((k) => k.includes('/records/'))).toBe(
          true
        )
      })
  )

  it.effect(
    'when the source responds with a non-2xx status, archives it and logs a warning',
    () =>
      Effect.gen(function* () {
        const storage = {}
        const logs: Array<{
          level: string
          message: unknown
          annotations: object
        }> = []

        yield* ingestFromSource({
          ingestorRunId: 'run-1',
          timestamp: 0,
          source: {
            id: 'politifact',
            name: 'politifact.com',
            url: 'https://www.politifact.com/rss/all/',
            collection: 'rss',
          },
        }).pipe(
          Effect.provide(
            InMemoryFetcher.layer(
              FetchSuccessSchema.make({
                finalUrl: 'https://www.politifact.com/rss/all/',
                status: 404,
                headers: {},
                contentType: 'text/html',
                etag: null,
                lastModified: null,
                bytes: 0,
                sha256:
                  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                body: new Uint8Array(),
                error:
                  'StatusCode: non 2xx status code (404 GET https://www.politifact.com/rss/all/)',
              })
            )
          ),
          Effect.provide(InMemoryStorageWriter.layer(storage)),
          Effect.provide(
            Logger.replace(
              Logger.defaultLogger,
              Logger.make(({ logLevel, message, annotations }) => {
                logs.push({
                  level: logLevel.label,
                  message,
                  annotations: Object.fromEntries(
                    HashMap.toEntries(annotations)
                  ),
                })
              })
            )
          )
        )

        expect(logs).toMatchObject([
          {
            level: 'WARN',
            message: ['Source returned an error status'],
            annotations: {
              event: 'fetch_success',
              'result.status': 'Not Found',
              'result.status_code': 404,
              'result.content_type': 'text/html',
            },
          },
        ])
      })
  )
})
