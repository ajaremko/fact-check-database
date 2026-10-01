import { describe, it, expect } from '@effect/vitest'
import { Effect, HashMap, Logger } from 'effect'

import * as InMemoryStorageWriter from '@fact-check-database/core-io/adapters/InMemoryStorageWriter'
import * as InMemoryStorageReader from '@fact-check-database/core-io/adapters/InMemoryStorageReader'

import { sanitizeObservation } from './sanitizeObservation'

describe('sanitizeObservation', () => {
  it.effect(
    'quarantines and writes a sanitizer record for non-data_fetched (no_response) records',
    () =>
      Effect.gen(function* () {
        const logs: Array<{
          level: string
          message: unknown
          annotations: object
        }> = []
        const storage: Record<string, string> = {
          '9bc46db65960ee6554a644a4abdf7c954146a6ba4843ee067dad576c01a8ceab.yml': `
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
              '9bc46db65960ee6554a644a4abdf7c954146a6ba4843ee067dad576c01a8ceab.yml',
          },
          timestamp: 0,
        }).pipe(
          Effect.provide(InMemoryStorageReader.layer(storage)),
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
            'v1/records/sanitizer/source=baddata/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/fetch_attempt.yml',
        })
        // A quarantine is a normal policy outcome, logged at info like any
        // other decision
        expect(logs).toMatchObject([
          {
            level: 'INFO',
            message: ['Record sanitized'],
            annotations: {
              event: 'record_sanitized',
              'decision.label': 'QUARANTINED',
              'source.id': 'baddata',
              'record.object':
                'v1/records/sanitizer/source=baddata/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/fetch_attempt.yml',
            },
          },
        ])
      })
  )

  it.effect(
    'writes sanitizer record and returns event for data_fetched records',
    () =>
      Effect.gen(function* () {
        const logs: Array<{
          level: string
          message: unknown
          annotations: object
        }> = []
        const storage: Record<string, string> = {
          '50d94538a271e9af89a43eedddd173552cad9f8b0a24bbe317246979c74bd75a.sanitize.yml': `
            version: 1
            kind: fetch_attempt
            outcome: data_fetched
            ingestor_run_id: 738aceb2-3212-4c1f-bcc4-3142f18396fb
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
                object: tmp/archive/v1/raw/source=factcheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/50d94538a271e9af89a43eedddd173552cad9f8b0a24bbe317246979c74bd75a.bin`,
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
            'v1/records/sanitizer/source=factcheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/fetch_attempt.yml',
        })
        expect(logs).toMatchObject([
          {
            level: 'INFO',
            message: ['Record sanitized'],
            annotations: {
              event: 'record_sanitized',
              'decision.label': 'SAFE_PUBLIC',
              'source.id': 'factcheck',
              'record.object':
                'v1/records/sanitizer/source=factcheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/fetch_attempt.yml',
            },
          },
        ])
      })
  )
})
