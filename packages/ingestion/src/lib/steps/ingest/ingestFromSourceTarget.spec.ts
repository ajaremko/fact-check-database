import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'

import { InMemoryStorageWriter, InMemoryFetcher } from '../../adapters'

import { ObservationIngested } from './ObservationIngested'
import { ingestFromSourceTarget } from './ingestFromSourceTarget'

describe('ingestFromSourceTarget', () => {
  it.effect(
    'when fetch is unsuccessful, returns IngestionAttempted event, writes records to archive',
    () =>
      Effect.gen(function* () {
        const storage = {}
        const result = yield* ingestFromSourceTarget({
          ingestionId: 'run-1',
          fetchedAt: 0,
          source: {
            name: 'source-1',
            url: 'https://test-rss.com/rss',
            collection: 'rss',
          },
        }).pipe(
          Effect.provide(
            InMemoryFetcher.layer({
              type: 'failure',
              error: 'Network error',
            })
          ),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(result).toStrictEqual(
          new ObservationIngested({
            observationId:
              'b57a9933660ea6f4e80b856bbab20a010ef8e5406d52f8d6fbe3fa00e3f410d4',
            runId: 'run-1',
            fetchedAt: 0,
            url: 'https://test-rss.com/rss',
            source: {
              collection: 'rss',
              name: 'source-1',
            },
            http: {
              status: 0,
            },
            content: {
              bytes: undefined,
              sha256: undefined,
            },
            error: 'Network error',
            pointer: {
              bucket: 'inmemory',
              object:
                'v1/records/source=source-1/date=1970-01-01/ingestionId=run-1/b57a9933660ea6f4e80b856bbab20a010ef8e5406d52f8d6fbe3fa00e3f410d4.ingestion.yml',
            },
          })
        )

        expect(storage).not.toHaveProperty(
          'v1/raw/source=source-1/date=1970-01-01/ingestionId=run-1/b57a9933660ea6f4e80b856bbab20a010ef8e5406d52f8d6fbe3fa00e3f410d4.bin'
        )
        expect(storage).toHaveProperty(
          'v1/records/source=source-1/date=1970-01-01/ingestionId=run-1/b57a9933660ea6f4e80b856bbab20a010ef8e5406d52f8d6fbe3fa00e3f410d4.ingestion.yml'
        )
      })
  )
  it.effect(
    'when fetch is successful, returns IngestionAttempted event, writes records and bin to archive',
    () =>
      Effect.gen(function* () {
        const storage = {}

        const result = yield* ingestFromSourceTarget({
          ingestionId: 'run-1',
          fetchedAt: 0,
          source: {
            name: 'source-1',
            url: 'https://test-rss.com/rss',
            collection: 'rss',
          },
        }).pipe(
          Effect.provide(
            InMemoryFetcher.layer({
              type: 'success',
              finalUrl: 'https://test-rss.com/rss',
              status: 200,
              headers: {},
              bytes: 100,
              sha256: 'dummy-sha256',
              body: new Uint8Array(),
              error: null,
            })
          ),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(result).toStrictEqual(
          new ObservationIngested({
            observationId:
              '3c6288f7453eb8da9b976edc9cb06412d3c9831f0141f0c6b3a7c475cc7c38f9',
            runId: 'run-1',
            fetchedAt: 0,
            url: 'https://test-rss.com/rss',
            finalUrl: 'https://test-rss.com/rss',
            source: {
              collection: 'rss',
              name: 'source-1',
            },
            http: {
              status: 200,
              etag: undefined,
              contentType: undefined,
              lastModified: undefined,
            },
            content: {
              bytes: 100,
              sha256: 'dummy-sha256',
            },
            error: undefined,
            pointer: {
              bucket: 'inmemory',
              object:
                'v1/records/source=source-1/date=1970-01-01/ingestionId=run-1/3c6288f7453eb8da9b976edc9cb06412d3c9831f0141f0c6b3a7c475cc7c38f9.ingestion.yml',
            },
          })
        )

        expect(storage).toHaveProperty(
          'v1/raw/source=source-1/date=1970-01-01/ingestionId=run-1/3c6288f7453eb8da9b976edc9cb06412d3c9831f0141f0c6b3a7c475cc7c38f9.bin'
        )
        expect(storage).toHaveProperty(
          'v1/records/source=source-1/date=1970-01-01/ingestionId=run-1/3c6288f7453eb8da9b976edc9cb06412d3c9831f0141f0c6b3a7c475cc7c38f9.ingestion.yml'
        )
      })
  )
})
