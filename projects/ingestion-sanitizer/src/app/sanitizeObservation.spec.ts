import { describe, it, expect } from '@effect/vitest'
import { Effect, HashMap, Logger, pipe, Schema } from 'effect'

import * as Yaml from '@fact-check-database/core-data/Yaml'
import * as InMemoryStorageWriter from '@fact-check-database/core-io/adapters/InMemoryStorageWriter'
import * as InMemoryStorageReader from '@fact-check-database/core-io/adapters/InMemoryStorageReader'
import { SanitizerRecordSchema } from '@fact-check-database/ingestion-contracts/archive/v1'

import { sanitizeObservation } from './sanitizeObservation'

const decodeRecord = pipe(
  SanitizerRecordSchema,
  Yaml.parseYaml(),
  Schema.decodeSync
)

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

  it.effect(
    'drops the listed headers and strips the final URL in the record',
    () =>
      Effect.gen(function* () {
        const storage: Record<string, string> = {
          'record.yml': `
            version: 1
            kind: fetch_attempt
            outcome: data_fetched
            ingestor_run_id: 738aceb2-3212-4c1f-bcc4-3142f18396fb
            fetched_at: 1777751768881
            source:
              id: africacheck
              name: africacheck.org
              url: https://africacheck.org/feed
              collection: rss
            status: 200
            final_url: https://africacheck.org/feed/?utm_source=redirect
            content_type: application/rss+xml; charset=UTF-8
            headers:
              content-type: application/rss+xml; charset=UTF-8
              Set-Cookie: __cf_bm=k3Jx9.Qz; path=/; HttpOnly; Secure
            content:
              sha256: bf7c4ba25af87eb5dc25a6e4486b21b00e8e6766f8f226ca54566b04a0c43429
              bytes: 113
              raw:
                bucket: inmemory
                object: v1/raw/source=africacheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/bf7c4ba25af87eb5dc25a6e4486b21b00e8e6766f8f226ca54566b04a0c43429.bin`,
        }

        yield* sanitizeObservation({
          policy: {
            version: 1,
            stripQueryParams: ['utm_'],
            dropHeaders: ['set-cookie', 'cookie', 'authorization'],
            collections: [
              {
                collection: 'rss',
                maxBytes: 1_000,
                defaultLabel: 'SAFE_PUBLIC',
                allowedContentTypeSubstrings: ['application/rss'],
              },
            ],
          },
          pointer: { bucket: 'inmemory', object: 'record.yml' },
          timestamp: 0,
        }).pipe(
          Effect.provide(InMemoryStorageReader.layer(storage)),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        const record = decodeRecord(
          storage[
            'v1/records/sanitizer/source=africacheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/fetch_attempt.yml'
          ]
        )
        expect(record.label).toBe('SAFE_PUBLIC')
        expect(record.actions).toStrictEqual([
          'DROPPED_HEADERS',
          'QUERY_STRIPPED',
        ])
        expect(record.http).toStrictEqual({
          status_code: 200,
          final_url: 'https://africacheck.org/feed/',
          content_type: 'application/rss+xml; charset=UTF-8',
          headers: { 'content-type': 'application/rss+xml; charset=UTF-8' },
        })
        // The rule doesn't ask for body rewriting, so the body isn't read
        expect(record.bytes_rewritten).toBe(false)
      })
  )

  it.effect(
    'rewrites a body whose URLs carry listed parameters and points the record at the sanitized copy',
    () =>
      Effect.gen(function* () {
        const logs: Array<{
          level: string
          message: unknown
          annotations: object
        }> = []
        const storage: Record<string, string> = {
          'record.yml': `
            version: 1
            kind: fetch_attempt
            outcome: data_fetched
            ingestor_run_id: 738aceb2-3212-4c1f-bcc4-3142f18396fb
            fetched_at: 1777751768881
            source:
              id: annielab
              name: annielab.org
              url: https://annielab.org/feed/
              collection: rss
            status: 200
            content_type: application/rss+xml; charset=UTF-8
            content:
              sha256: dc3c013dca092f6a87029969a9078b7e2e7016e2458f73f9f23a708790de2e13
              bytes: 178
              raw:
                bucket: inmemory
                object: v1/raw/source=annielab/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/dc3c013dca092f6a87029969a9078b7e2e7016e2458f73f9f23a708790de2e13.bin`,
          'v1/raw/source=annielab/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/dc3c013dca092f6a87029969a9078b7e2e7016e2458f73f9f23a708790de2e13.bin':
            '<rss><channel><item><title>Vérification : a viral claim</title><link>https://annielab.org/2026/05/01/claim-check/?utm_source=rss&amp;utm_medium=rss</link></item></channel></rss>',
        }

        yield* sanitizeObservation({
          policy: {
            version: 1,
            stripQueryParams: ['utm_'],
            dropHeaders: [],
            collections: [
              {
                collection: 'rss',
                maxBytes: 1_000,
                defaultLabel: 'SAFE_PUBLIC',
                allowedContentTypeSubstrings: ['application/rss'],
                rewriteBody: true,
              },
            ],
          },
          pointer: { bucket: 'inmemory', object: 'record.yml' },
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

        // The sanitized copy is named after the SHA-256 of its own bytes
        expect(
          storage[
            'v1/sanitized/source=annielab/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/a8e652613a97880e8ff04c0a2e2c9ac3d2a342d5c346a3d8f831e62d84ccca22.bin'
          ]
        ).toBe(
          '<rss><channel><item><title>Vérification : a viral claim</title><link>https://annielab.org/2026/05/01/claim-check/</link></item></channel></rss>'
        )

        const record = decodeRecord(
          storage[
            'v1/records/sanitizer/source=annielab/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/fetch_attempt.yml'
          ]
        )
        expect(record.actions).toStrictEqual([
          'QUERY_STRIPPED',
          'BODY_REWRITTEN',
        ])
        expect(record.bytes_rewritten).toBe(true)
        expect(record.content).toStrictEqual({
          sha256:
            'a8e652613a97880e8ff04c0a2e2c9ac3d2a342d5c346a3d8f831e62d84ccca22',
          bytes: 144,
          sanitized: {
            bucket: 'inmemory',
            object:
              'v1/sanitized/source=annielab/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/a8e652613a97880e8ff04c0a2e2c9ac3d2a342d5c346a3d8f831e62d84ccca22.bin',
          },
        })
        // The raw body stays reachable from the record
        expect(record.input.raw).toStrictEqual({
          bucket: 'inmemory',
          object:
            'v1/raw/source=annielab/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/dc3c013dca092f6a87029969a9078b7e2e7016e2458f73f9f23a708790de2e13.bin',
        })
        expect(logs).toMatchObject([
          {
            level: 'INFO',
            message: ['Record sanitized'],
            annotations: {
              'decision.actions': 'QUERY_STRIPPED,BODY_REWRITTEN',
              'headers.dropped': 0,
              'body.urlsStripped': 1,
              'sanitized.object':
                'v1/sanitized/source=annielab/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/a8e652613a97880e8ff04c0a2e2c9ac3d2a342d5c346a3d8f831e62d84ccca22.bin',
            },
          },
        ])
      })
  )

  it.effect(
    'writes no sanitized copy when the body has nothing to strip, and keeps pointing at the raw body',
    () =>
      Effect.gen(function* () {
        const storage: Record<string, string> = {
          'record.yml': `
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
            content:
              sha256: bf7c4ba25af87eb5dc25a6e4486b21b00e8e6766f8f226ca54566b04a0c43429
              bytes: 113
              raw:
                bucket: inmemory
                object: v1/raw/source=factcheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/bf7c4ba25af87eb5dc25a6e4486b21b00e8e6766f8f226ca54566b04a0c43429.bin`,
          'v1/raw/source=factcheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/bf7c4ba25af87eb5dc25a6e4486b21b00e8e6766f8f226ca54566b04a0c43429.bin':
            '<rss><channel><item><title>A viral claim</title><link>https://factcheck.org/?p=4720</link></item></channel></rss>',
        }

        yield* sanitizeObservation({
          policy: {
            version: 1,
            stripQueryParams: ['utm_'],
            dropHeaders: [],
            collections: [
              {
                collection: 'rss',
                maxBytes: 1_000,
                defaultLabel: 'SAFE_PUBLIC',
                allowedContentTypeSubstrings: ['application/rss'],
                rewriteBody: true,
              },
            ],
          },
          pointer: { bucket: 'inmemory', object: 'record.yml' },
          timestamp: 0,
        }).pipe(
          Effect.provide(InMemoryStorageReader.layer(storage)),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(Object.keys(storage)).toStrictEqual([
          'record.yml',
          'v1/raw/source=factcheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/bf7c4ba25af87eb5dc25a6e4486b21b00e8e6766f8f226ca54566b04a0c43429.bin',
          'v1/records/sanitizer/source=factcheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/fetch_attempt.yml',
        ])

        const record = decodeRecord(
          storage[
            'v1/records/sanitizer/source=factcheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/fetch_attempt.yml'
          ]
        )
        expect(record.actions).toStrictEqual([])
        expect(record.bytes_rewritten).toBe(false)
        expect(record.content).toStrictEqual({
          sha256:
            'bf7c4ba25af87eb5dc25a6e4486b21b00e8e6766f8f226ca54566b04a0c43429',
          bytes: 113,
          sanitized: {
            bucket: 'inmemory',
            object:
              'v1/raw/source=factcheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/bf7c4ba25af87eb5dc25a6e4486b21b00e8e6766f8f226ca54566b04a0c43429.bin',
          },
        })
      })
  )

  it.effect(
    'drops headers from a quarantined record but does not rewrite its body',
    () =>
      Effect.gen(function* () {
        const storage: Record<string, string> = {
          'record.yml': `
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
            content_type: text/html; charset=UTF-8
            headers:
              content-type: text/html; charset=UTF-8
              set-cookie: session=k3Jx9Qz; path=/
            content:
              sha256: ee7e8b083a17e00b7d0a45940b055bf8cc1152ce395d2f4b99fd679439af0d3a
              bytes: 88
              raw:
                bucket: inmemory
                object: v1/raw/source=factcheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/ee7e8b083a17e00b7d0a45940b055bf8cc1152ce395d2f4b99fd679439af0d3a.bin`,
          'v1/raw/source=factcheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/ee7e8b083a17e00b7d0a45940b055bf8cc1152ce395d2f4b99fd679439af0d3a.bin':
            '<html><body><a href="https://example.org/login?utm_source=rss">Sign in</a></body></html>',
        }

        yield* sanitizeObservation({
          policy: {
            version: 1,
            stripQueryParams: ['utm_'],
            dropHeaders: ['set-cookie'],
            collections: [
              {
                collection: 'rss',
                maxBytes: 1_000,
                defaultLabel: 'SAFE_PUBLIC',
                allowedContentTypeSubstrings: ['application/rss'],
                rewriteBody: true,
              },
            ],
          },
          pointer: { bucket: 'inmemory', object: 'record.yml' },
          timestamp: 0,
        }).pipe(
          Effect.provide(InMemoryStorageReader.layer(storage)),
          Effect.provide(InMemoryStorageWriter.layer(storage))
        )

        expect(Object.keys(storage)).toStrictEqual([
          'record.yml',
          'v1/raw/source=factcheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/ee7e8b083a17e00b7d0a45940b055bf8cc1152ce395d2f4b99fd679439af0d3a.bin',
          'v1/records/sanitizer/source=factcheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/fetch_attempt.yml',
        ])

        const record = decodeRecord(
          storage[
            'v1/records/sanitizer/source=factcheck/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/fetch_attempt.yml'
          ]
        )
        expect(record.label).toBe('QUARANTINED')
        expect(record.actions).toStrictEqual([
          'QUARANTINED_UNEXPECTED_CONTENT_TYPE',
          'DROPPED_HEADERS',
        ])
        expect(record.http?.headers).toStrictEqual({
          'content-type': 'text/html; charset=UTF-8',
        })
        expect(record.bytes_rewritten).toBe(false)
      })
  )

  it.effect("writes the policy's version to the record as policy_version", () =>
    Effect.gen(function* () {
      const storage: Record<string, string> = {
        'record.yml': `
            version: 1
            kind: fetch_attempt
            outcome: no_response
            ingestor_run_id: 738aceb2-3212-4c1f-bcc4-3142f18396fb
            fetched_at: 1777751768896
            source:
              id: snopes
              name: snopes.com
              url: https://www.snopes.com/feed/
              collection: rss
            error: Transport error (GET https://www.snopes.com/feed/)`,
      }

      yield* sanitizeObservation({
        policy: {
          version: 7,
          stripQueryParams: [],
          dropHeaders: [],
          collections: [
            { collection: 'rss', maxBytes: 1_000, defaultLabel: 'SAFE_PUBLIC' },
          ],
        },
        pointer: { bucket: 'inmemory', object: 'record.yml' },
        timestamp: 0,
      }).pipe(
        Effect.provide(InMemoryStorageReader.layer(storage)),
        Effect.provide(InMemoryStorageWriter.layer(storage))
      )

      const record = decodeRecord(
        storage[
          'v1/records/sanitizer/source=snopes/date=2026-05-02/ingestor_run_id=738aceb2-3212-4c1f-bcc4-3142f18396fb/fetch_attempt.yml'
        ]
      )
      // The record format's own version stays 1; the policy's is separate
      expect(record.version).toBe(1)
      expect(record.policy_version).toBe(7)
    })
  )
})
