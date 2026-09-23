import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'

import * as InMemoryStorageWriter from '@fact-check-database/core-io/adapters/InMemoryStorageWriter'

import { writeBatch } from './writeBatch'

describe('writeBatch', () => {
  it.effect(
    'writes NDJSON file to storage and returns an ExtractionBatchReady event',
    () =>
      Effect.gen(function* () {
        const storage: Record<string, string> = {}
        const event = yield* writeBatch({
          extractorRunId: 'run-001',
          rows: [
            {
              factCheckId: 'fact-check-1',
              ingestorRunId: 'd8af0771-64e4-4e86-99ba-000c6550d2de',
              extractorRunId: 'run-001',
              extractedAt: 0,
              fetchedAt: 0,
              extractor: {
                id: 'extractor-id',
                version: 1,
              },
              factCheck: {
                sha256:
                  '1b19c84b36375c70131c9dee078f1bb931fcbcdce18c18e6fffed7ca14d0c479',
                title: 'A false claim about something',
                link: 'https://example.com/fact-check-1',
                summary: 'The claim is false.',
                publishedAtRaw: 'Wed, 01 Jan 2026 00:00:00 +0000',
                publishedAtNormalized: new Date(
                  'Wed, 01 Jan 2026 00:00:00 +0000'
                ),
                canonicalUrl: null,
              },
              http: {
                contentSha256:
                  '311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6',
                status: 200,
                finalUrl: null,
                contentType: 'application/rss+xml',
                etag: null,
                lastModified: null,
                headers: {},
              },
              source: {
                id: 'politifact',
                name: 'politifact.com',
                url: 'https://www.politifact.com/rss/all/',
                collection: 'rss',
              },
            },
          ],
          timestamp: 1_000,
          type: 'fact_checks',
        }).pipe(Effect.provide(InMemoryStorageWriter.layer(storage)))

        expect(
          storage['v1/type=fact_checks/date=1970-01-01/run-001.batch.ndjson']
        ).toBeDefined()

        expect(event).toStrictEqual({
          extractorRunId: 'run-001',
          extractedAt: 1_000,
          sourceFormat: 'NEWLINE_DELIMITED_JSON',
          type: 'fact_checks',
          pointer: {
            bucket: 'inmemory',
            object: 'v1/type=fact_checks/date=1970-01-01/run-001.batch.ndjson',
          },
        })
      })
  )
})
