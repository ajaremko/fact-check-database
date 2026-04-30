import { it, expect } from '@effect/vitest'
import { Effect } from 'effect'

import { InMemoryStorageReader, InMemoryStorageWriter } from '../../adapters'

import { sanitizeObservation } from './sanitizeObservation'
import { ObservationSanitized } from './ObservationSanitized'

describe('sanitizeObservation', () => {
  it.effect(
    'skips non-data_fetched records and returns empty array without writing',
    () =>
      Effect.gen(function* () {
        const storage: Record<string, string> = {
          'test-record.yml': `
            version: 1
            kind: fetch_attempt
            outcome: no_response
            content_lineage_id: 9bc46db65960ee6554a644a4abdf7c954146a6ba4843ee067dad576c01a8ceab
            ingestion_batch_id: d8af0771-64e4-4e86-99ba-000c6550d2de
            fetched_at: 0
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
            bucket: 'test-bucket',
            object: 'test-record.yml',
          },
          timestamp: 0,
        }).pipe(
          Effect.provide(InMemoryStorageReader.layer(storage)),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(result).toStrictEqual(
          new ObservationSanitized({
            ingestionId: 'd8af0771-64e4-4e86-99ba-000c6550d2de',
            observationId:
              '9bc46db65960ee6554a644a4abdf7c954146a6ba4843ee067dad576c01a8ceab',
            fetchedAt: 0,
            error: 'Transport error (GET https://baddata.com/rss.xml)',
            source: {
              id: 'baddata',
              name: 'baddata.com',
              url: 'https://baddata.com/rss.xml',
              collection: 'rss',
            },
            pointer: {
              bucket: 'inmemory',
              object:
                'v1/records/source=baddata.com/date=1970-01-01/ingestion_id=d8af0771-64e4-4e86-99ba-000c6550d2de/9bc46db65960ee6554a644a4abdf7c954146a6ba4843ee067dad576c01a8ceab.sanitize.yml',
            },
          })
        )
      })
  )

  it.effect(
    'writes sanitizer record and returns SanitizationAttempted event for data_fetched records',
    () =>
      Effect.gen(function* () {
        const storage: Record<string, string> = {
          'test-record.yml': `
            version: 1
            kind: fetch_attempt
            outcome: data_fetched
            content_lineage_id: 2c7d4fb69c6364835e25a40a877703a80ecb9947b5f5b8f4861edfd5052595f1
            ingestion_batch_id: d8af0771-64e4-4e86-99ba-000c6550d2de
            fetched_at: 0
            source:
              id: leadstories
              name: leadstories.com
              url: https://leadstories.com/atom.xml
              collection: atom
            status: 200
            content_type: application/xml
            etag: W/"1cc80-6509d7f79734d-gzip"
            last_modified: Wed, 29 Apr 2026 18:27:19 GMT
            headers:
              date: Wed, 29 Apr 2026 20:35:08 GMT
              content-type: application/xml
              transfer-encoding: chunked
              connection: keep-alive
              server: cloudflare
              last-modified: Wed, 29 Apr 2026 18:27:19 GMT
              cf-cache-status: DYNAMIC
              vary: Accept-Encoding
              access-control-allow-origin: "*"
              cache-control: s-maxage=10
              speculation-rules: '"/cdn-cgi/speculation"'
              etag: W/"1cc80-6509d7f79734d-gzip"
              cf-ray: 9f411768cb7ecfa8-SJC
              alt-svc: h3=":443"; ma=86400
            content:
              sha256: 767ad7d658f71e21ac22d35bc871a6d9f17e6d2bd322ac28be942af63cba8ecd
              bytes: 117888
              raw:
                bucket: local
                object: tmp/archive/v1/raw/source=leadstories.com/date=1970-01-01/ingestion_id=d8af0771-64e4-4e86-99ba-000c6550d2de/2c7d4fb69c6364835e25a40a877703a80ecb9947b5f5b8f4861edfd5052595f1.bin`,
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
            bucket: 'test-bucket',
            object: 'test-record.yml',
          },
          timestamp: 0,
        }).pipe(
          Effect.provide(InMemoryStorageReader.layer(storage)),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(result).toStrictEqual(
          new ObservationSanitized({
            ingestionId: 'd8af0771-64e4-4e86-99ba-000c6550d2de',
            observationId:
              '2c7d4fb69c6364835e25a40a877703a80ecb9947b5f5b8f4861edfd5052595f1',
            content: {
              bytes: 117888,
              sha256:
                '767ad7d658f71e21ac22d35bc871a6d9f17e6d2bd322ac28be942af63cba8ecd',
            },
            fetchedAt: 0,
            http: {
              contentType: 'application/xml',
              etag: 'W/"1cc80-6509d7f79734d-gzip"',
              lastModified: 'Wed, 29 Apr 2026 18:27:19 GMT',
              status: 200,
            },
            pointer: {
              bucket: 'inmemory',
              object:
                'v1/records/source=leadstories.com/date=1970-01-01/ingestion_id=d8af0771-64e4-4e86-99ba-000c6550d2de/2c7d4fb69c6364835e25a40a877703a80ecb9947b5f5b8f4861edfd5052595f1.sanitize.yml',
            },
            source: {
              collection: 'atom',
              id: 'leadstories',
              name: 'leadstories.com',
              url: 'https://leadstories.com/atom.xml',
            },
          })
        )
      })
  )
})
