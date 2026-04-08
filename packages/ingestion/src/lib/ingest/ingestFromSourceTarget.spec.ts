import { it, expect } from '@effect/vitest'
import { Effect, Either, Layer } from 'effect'

import { Fetcher, FetchResult } from './Fetcher'
import { Archiver } from './Archiver'
import { IdGenerator } from './IdGenerator'
import { ingestFromSourceTarget } from './ingestFromSourceTarget'

function TestFetcher(result: FetchResult) {
  return Layer.succeed(Fetcher, {
    fetch: () => Effect.succeed(result),
  })
}

function TestArchiver(archive: Record<string, unknown>) {
  return Layer.succeed(Archiver, {
    archiveBody: (path: string, id: string, body: Uint8Array) =>
      Effect.sync(() => {
        const key = `raw/${path}/${id}.bin`
        archive[key] = body
        return {
          object: key,
          bucket: 'test-bucket',
        }
      }),
    archiveRecord: (path, id, record, metadata) =>
      Effect.sync(() => {
        const key = `records/${path}/${id}.yml`
        const metadataKey = `records/${path}/${id}.metadata.json`
        archive[key] = record
        archive[metadataKey] = metadata
        return {
          object: key,
          bucket: 'test-bucket',
        }
      }),
  })
}

function TestIdGenerator(id: string) {
  return Layer.succeed(IdGenerator, {
    generate: Effect.succeed(id),
  })
}

describe('ingestFromSourceTarget', () => {
  it.effect(
    'when fetch is unsuccessful, returns IngestionAttempted event, writes records to archive',
    () =>
      Effect.gen(function* () {
        const archive = {}

        const result = yield* ingestFromSourceTarget(
          'run-1',
          {
            name: 'source-1',
            url: 'https://test-rss.com/rss',
            collection: 'rss',
          },
          0
        ).pipe(
          Effect.provide(
            TestFetcher(
              Either.left({
                error: 'Network error',
              })
            )
          ),
          Effect.provide(TestArchiver(archive)),
          Effect.provide(TestIdGenerator('087e1b8cd61c1'))
        )

        expect(result).toStrictEqual({
          observationId:
            '2a0eeefe79c722be601b96c20e4f06a1403fa4098a813d223ac96f3ec893bf95',
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
            bucket: 'test-bucket',
            object:
              'records/source=source-1/date=1970-01-01/run=run-1/087e1b8cd61c1.yml',
          },
        })

        expect(archive).not.toHaveProperty(
          'raw/source=source-1/date=1970-01-01/run=run-1/087e1b8cd61c1.bin'
        )
        expect(archive).toHaveProperty(
          'records/source=source-1/date=1970-01-01/run=run-1/087e1b8cd61c1.yml'
        )
        expect(archive).toHaveProperty(
          'records/source=source-1/date=1970-01-01/run=run-1/087e1b8cd61c1.metadata.json'
        )
      })
  )
  it.effect(
    'when fetch is successful, returns IngestionAttempted event, writes records and bin to archive',
    () =>
      Effect.gen(function* () {
        const archive = {}

        const result = yield* ingestFromSourceTarget(
          'run-1',
          {
            name: 'source-1',
            url: 'https://test-rss.com/rss',
            collection: 'rss',
          },
          0
        ).pipe(
          Effect.provide(
            TestFetcher(
              Either.right({
                finalUrl: 'https://test-rss.com/rss',
                status: 200,
                headers: {},
                bytes: 100,
                sha256: 'dummy-sha256',
                body: new Uint8Array(),
                error: null,
              })
            )
          ),
          Effect.provide(TestArchiver(archive)),
          Effect.provide(TestIdGenerator('087e1b8cd61c1'))
        )

        expect(result).toStrictEqual({
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
            bucket: 'test-bucket',
            object:
              'records/source=source-1/date=1970-01-01/run=run-1/dummy-sha256.yml',
          },
        })

        expect(archive).toHaveProperty(
          'raw/source=source-1/date=1970-01-01/run=run-1/dummy-sha256.bin'
        )
        expect(archive).toHaveProperty(
          'records/source=source-1/date=1970-01-01/run=run-1/dummy-sha256.yml'
        )
        expect(archive).toHaveProperty(
          'records/source=source-1/date=1970-01-01/run=run-1/dummy-sha256.metadata.json'
        )
      })
  )
})
