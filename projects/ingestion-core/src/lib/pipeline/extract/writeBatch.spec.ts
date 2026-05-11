import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'

import { InMemoryStorageWriter } from '../shared'

import { FactChecksTableSchema } from './contracts/v1'
import { writeBatch } from './writeBatch'

describe('writeBatch', () => {
  it.effect(
    'writes NDJSON file to storage and returns an ExtractionBatchReady event',
    () =>
      Effect.gen(function* () {
        const storage: Record<string, string> = {}
        const event = yield* writeBatch({
          runId: 'run-001',
          rows: [
            {
              id: '1b19c84b36375c70131c9dee078f1bb931fcbcdce18c18e6fffed7ca14d0c479',
              observationId:
                'b35daedf9f4b7e00d65782695540bbdf161b3127a19d6251346b4b197aa2d1bb',
              ingestionId: 'd8af0771-64e4-4e86-99ba-000c6550d2de',
              extractionId: 'run-001',
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
                claim: 'A false claim about something',
                verdictRaw: 'false',
                link: 'https://example.com/fact-check-1',
                verdictNormalized: 'false',
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
          datasetId: 'research',
          tableId: 'fact-checks',
        }).pipe(Effect.provide(InMemoryStorageWriter.layer(storage)))

        expect(storage['fact-checks/run-001.ndjson']).toBeDefined()
        expect(event).toStrictEqual({
          version: 1,
          extraction_batch_id: 'run-001',
          extracted_at: 1_000,
          source_format: 'NEWLINE_DELIMITED_JSON',
          table: {
            dataset_id: 'research',
            table_id: 'fact-checks',
          },
          schema: FactChecksTableSchema,
          pointer: {
            bucket: 'inmemory',
            object: 'fact-checks/run-001.ndjson',
          },
        })
      })
  )
})
