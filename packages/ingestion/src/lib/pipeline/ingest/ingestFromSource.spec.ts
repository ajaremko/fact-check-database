import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'

import { InMemoryStorageWriter, InMemoryFetcher } from '../../adapters'

import { ingestFromSource } from './ingestFromSource'
import { FetchFailureSchema, FetchSuccessSchema } from './FetchResult'
import { Fetcher, FetcherError } from './Fetcher'

describe('ingestFromSourceTarget', () => {
  it.effect(
    'when fetch is unsuccessful, returns IngestionAttempted event, writes records to archive',
    () =>
      Effect.gen(function* () {
        const storage = {}
        const result = yield* ingestFromSource({
          ingestionId: 'run-1',
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
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(result).toStrictEqual({
          version: 1,
          content_lineage_id:
            'dc703a8a4070ee77dbac02410f3b06209435c6a545095f9bd998eeb61be5ddfe',
          ingestion_batch_id: 'run-1',
          fetched_at: 0,
          source: {
            collection: 'rss',
            id: 'baddata',
            name: 'baddata.com',
            url: 'https://baddata.com/rss.xml',
          },
          pointer: {
            bucket: 'inmemory',
            object:
              'v1/records/source=baddata.com/date=1970-01-01/ingestion_id=run-1/dc703a8a4070ee77dbac02410f3b06209435c6a545095f9bd998eeb61be5ddfe.ingestion.yml',
          },
          error: 'Transport error (GET https://baddata.com/rss.xml)',
        })

        expect(storage).not.toHaveProperty(
          'v1/raw/source=baddata.com/date=1970-01-01/ingestion_id=run-1/dc703a8a4070ee77dbac02410f3b06209435c6a545095f9bd998eeb61be5ddfe.bin'
        )
        expect(storage).toHaveProperty(
          'v1/records/source=baddata.com/date=1970-01-01/ingestion_id=run-1/dc703a8a4070ee77dbac02410f3b06209435c6a545095f9bd998eeb61be5ddfe.ingestion.yml'
        )
      })
  )
  it.effect(
    'when fetch is successful, returns IngestionAttempted event, writes records and bin to archive',
    () =>
      Effect.gen(function* () {
        const storage = {}

        const result = yield* ingestFromSource({
          ingestionId: 'run-1',
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
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(result).toStrictEqual({
          version: 1,
          content_lineage_id:
            'b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb',
          ingestion_batch_id: 'run-1',
          fetched_at: 0,
          final_url: 'https://www.politifact.com/rss/all/',
          source: {
            id: 'politifact',
            collection: 'rss',
            name: 'politifact.com',
            url: 'https://www.politifact.com/rss/all/',
          },
          status: 200,
          etag: '33a64df551425fcc55e4d42a148795d9f25f89d4',
          content_type: 'application/rss+xml; charset=utf-8',
          last_modified: 'Wed, 29 Apr 2026 16:20:04 GMT',
          content_bytes: 10648,
          content_sha256:
            '311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6',
          pointer: {
            bucket: 'inmemory',
            object:
              'v1/records/source=politifact.com/date=1970-01-01/ingestion_id=run-1/b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb.ingestion.yml',
          },
        })

        expect(storage).toHaveProperty(
          'v1/raw/source=politifact.com/date=1970-01-01/ingestion_id=run-1/b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb.bin'
        )
        expect(storage).toHaveProperty(
          'v1/records/source=politifact.com/date=1970-01-01/ingestion_id=run-1/b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb.ingestion.yml'
        )
      })
  )

  it.effect(
    'when fetcher throws FetcherError, the error propagates out of ingestFromSource',
    () =>
      Effect.gen(function* () {
        const failingFetcherLayer = Layer.succeed(Fetcher, {
          fetch: () =>
            Effect.fail(
              new FetcherError({
                cause: 'network timeout',
                source: {
                  id: 'baddata',
                  name: 'baddata.com',
                  collection: 'rss',
                  url: 'https://baddata.com/rss.xml',
                },
              })
            ),
        })

        const err = yield* ingestFromSource({
          ingestionId: 'run-1',
          timestamp: 0,
          source: {
            id: 'baddata',
            name: 'baddata.com',
            url: 'https://baddata.com/rss.xml',
            collection: 'rss',
          },
        }).pipe(
          Effect.provide(failingFetcherLayer),
          Effect.provide(InMemoryStorageWriter.layer({})),
          Effect.flip
        )

        expect(err._tag).toBe('FetcherError')
      })
  )

  it.effect(
    'when fetch is successful with null optional fields, omits content_type, etag, last_modified from event',
    () =>
      Effect.gen(function* () {
        const storage = {}

        const result = yield* ingestFromSource({
          ingestionId: 'run-1',
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
          Effect.provide(InMemoryStorageWriter.layer(storage))
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
})
