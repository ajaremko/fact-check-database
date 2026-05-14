import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'

import * as InMemoryStorageWriter from '../shared/adapters/InmemoryStorageWriter'
import * as InMemoryStorageReader from '../shared/adapters/InmemoryStorageReader'

import { sanitizeObservation } from './sanitizeObservation'

describe('sanitizeObservation', () => {
  it.effect(
    'skips non-data_fetched records and returns empty array without writing',
    () =>
      Effect.gen(function* () {
        const storage: Record<string, string> = {
          '9bc46db65960ee6554a644a4abdf7c954146a6ba4843ee067dad576c01a8ceab.sanitize.yml': `
            version: 1
            kind: fetch_attempt
            outcome: no_response
            content_lineage_id: 526267ce9066cd5d1c035cc9e678a9ad485f355ecdfc80b73749c9579fcad5d1
            ingestion_batch_id: 738aceb2-3212-4c1f-bcc4-3142f18396fb
            fetched_at: 1777751768896
            source:
              id: baddata
              name: baddata.com
              url: https://baddata.com/rss.xml
              collection: rss
            error: Transport error (GET https://baddata.com/rss.xml)`,
        }

        const result = yield* sanitizeObservation({
          policy: {
            version: 1,
            stripQueryParams: [],
            dropHeaders: [],
            collections: [
              {
                collection: 'rss',
                maxBytes: 1_000,
                defaultLabel: 'SAFE_PUBLIC',
                allowedContentTypeSubstrings: ['text/xml', 'application/rss'],
              },
            ],
          },
          pointer: {
            bucket: 'inmemory',
            object:
              '9bc46db65960ee6554a644a4abdf7c954146a6ba4843ee067dad576c01a8ceab.sanitize.yml',
          },
          timestamp: 0,
        }).pipe(
          Effect.provide(InMemoryStorageReader.layer(storage)),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(result).toStrictEqual({
          version: 1,
          content_lineage_id:
            '526267ce9066cd5d1c035cc9e678a9ad485f355ecdfc80b73749c9579fcad5d1',
          ingestion_batch_id: '738aceb2-3212-4c1f-bcc4-3142f18396fb',
          fetched_at: 1777751768896,
          sanitized_at: 0,
          source: {
            id: 'baddata',
            name: 'baddata.com',
            url: 'https://baddata.com/rss.xml',
            collection: 'rss',
          },
          label: 'QUARANTINED',
          actions: ['QUARANTINED_FETCH_FAILED'],
          pointer: {
            bucket: 'inmemory',
            object:
              'v1/records/source=baddata.com/date=2026-05-02/ingestion_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/526267ce9066cd5d1c035cc9e678a9ad485f355ecdfc80b73749c9579fcad5d1.sanitize.yml',
          },
        })
      })
  )

  it.effect(
    'writes sanitizer record and returns event for data_fetched records',
    () =>
      Effect.gen(function* () {
        const storage: Record<string, string> = {
          '50d94538a271e9af89a43eedddd173552cad9f8b0a24bbe317246979c74bd75a.sanitize.yml': `
            version: 1
            kind: fetch_attempt
            outcome: data_fetched
            content_lineage_id: 50d94538a271e9af89a43eedddd173552cad9f8b0a24bbe317246979c74bd75a
            ingestion_batch_id: 738aceb2-3212-4c1f-bcc4-3142f18396fb
            fetched_at: 1777751768881
            source:
              id: factcheck
              name: factcheck.org
              url: https://www.factcheck.org/feed/
              collection: rss
            status: 200
            content_type: application/rss+xml; charset=UTF-8
            etag: '"a89eb068250919fc594f4fde501b45dd"'
            last_modified: Fri, 01 May 2026 18:25:40 GMT
            headers:
              date: Sat, 02 May 2026 19:56:09 GMT
              content-type: application/rss+xml; charset=UTF-8
              last-modified: Fri, 01 May 2026 18:25:40 GMT
              etag: '"a89eb068250919fc594f4fde501b45dd"'
            content:
              sha256: 64916224466c53b233ca3de8ba1f055d157801216f030221afc03b4caf16dae0
              bytes: 256
              raw:
                bucket: local
                object: tmp/archive/v1/raw/source=factcheck.org/date=2026-05-02/ingestion_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/50d94538a271e9af89a43eedddd173552cad9f8b0a24bbe317246979c74bd75a.bin`,
        }
        const result = yield* sanitizeObservation({
          policy: {
            version: 1,
            stripQueryParams: [],
            dropHeaders: [],
            collections: [
              {
                collection: 'rss',
                maxBytes: 1_000,
                defaultLabel: 'SAFE_PUBLIC',
                allowedContentTypeSubstrings: ['text/xml', 'application/rss'],
              },
            ],
          },
          pointer: {
            bucket: 'inmemory',
            object:
              '50d94538a271e9af89a43eedddd173552cad9f8b0a24bbe317246979c74bd75a.sanitize.yml',
          },
          timestamp: 0,
        }).pipe(
          Effect.provide(InMemoryStorageReader.layer(storage)),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(result).toStrictEqual({
          version: 1,
          content_lineage_id:
            '50d94538a271e9af89a43eedddd173552cad9f8b0a24bbe317246979c74bd75a',
          ingestion_batch_id: '738aceb2-3212-4c1f-bcc4-3142f18396fb',
          fetched_at: 1777751768881,
          sanitized_at: 0,
          source: {
            id: 'factcheck',
            name: 'factcheck.org',
            url: 'https://www.factcheck.org/feed/',
            collection: 'rss',
          },
          label: 'SAFE_PUBLIC',
          actions: [],
          content_sha256:
            '64916224466c53b233ca3de8ba1f055d157801216f030221afc03b4caf16dae0',
          content_bytes: 256,
          pointer: {
            bucket: 'inmemory',
            object:
              'v1/records/source=factcheck.org/date=2026-05-02/ingestion_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/50d94538a271e9af89a43eedddd173552cad9f8b0a24bbe317246979c74bd75a.sanitize.yml',
          },
        })
      })
  )
})
