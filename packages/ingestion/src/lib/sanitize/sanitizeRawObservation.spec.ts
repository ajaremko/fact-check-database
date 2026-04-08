import { it, expect } from '@effect/vitest'
import { Effect, Layer } from 'effect'

import {
  DataFetchedRecord,
  NoResponseRecord,
  type IngestionRecord,
  type FilePointer,
  type SanitizerRecord,
  type SanitizerRecordMetadata,
} from '../data'
import { Archiver } from './Archiver'
import type { SanitizerPolicy } from './SanitizerPolicy'
import { sanitizeRawObservation } from './sanitizeRawObservation'

const testPointer: FilePointer = {
  bucket: 'test-bucket',
  object: 'records/source=source-1/date=1970-01-01/run=run-1/record.yml',
}

const basePolicy: SanitizerPolicy = {
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
}

function TestArchiver(
  fetchRecord: IngestionRecord,
  written: {
    record?: SanitizerRecord
    metadata?: SanitizerRecordMetadata
  }
) {
  return Layer.succeed(Archiver, {
    readRawBody: () => Effect.succeed(new Uint8Array()),
    readFetchAttemptRecord: () => Effect.succeed(fetchRecord),
    writeSanitizedBody: () =>
      Effect.succeed({ bucket: 'test-bucket', object: 'sanitized/body.bin' }),
    writeSanitizerRecord: (baseDir, record, metadata) =>
      Effect.sync(() => {
        written.record = record
        written.metadata = metadata
        return {
          bucket: 'test-bucket',
          object: `sanitized/${baseDir}/record.yml`,
        }
      }),
  })
}

describe('sanitizeRawObservation', () => {
  it.effect(
    'skips non-data_fetched records and returns empty array without writing',
    () =>
      Effect.gen(function* () {
        const written = {}
        const record = NoResponseRecord({
          runId: 'run-1',
          fetchedAt: 0,
          url: 'https://example.com/feed',
          source: { name: 'source-1', collection: 'rss' },
          error: 'Network error',
        })

        const result = yield* sanitizeRawObservation(
          basePolicy,
          'obs-1',
          testPointer
        ).pipe(Effect.provide(TestArchiver(record, written)))

        expect(result).toStrictEqual([])
        expect(written).not.toHaveProperty('record')
      })
  )

  it.effect(
    'quarantines record when body exceeds maxBytes',
    () =>
      Effect.gen(function* () {
        const written: { record?: SanitizerRecord } = {}
        const record = DataFetchedRecord({
          runId: 'run-1',
          fetchedAt: 0,
          url: 'https://example.com/feed',
          source: { name: 'source-1', collection: 'rss' },
          http: { status: 200, contentType: 'text/xml', headers: {} },
          content: { bytes: 2_000, sha256: 'abc123' }, // exceeds maxBytes: 1_000
          pointer: testPointer,
        })

        const result = yield* sanitizeRawObservation(
          basePolicy,
          'obs-1',
          testPointer
        ).pipe(Effect.provide(TestArchiver(record, written)))

        expect(result).toHaveLength(1)
        expect(result[0].error).toMatch(/too large/i)
        expect(written.record?.policy).toStrictEqual({
          label: 'QUARANTINED',
          actions: ['QUARANTINED_TOO_LARGE'],
        })
      })
  )

  it.effect(
    'quarantines record when content-type is not in allowlist',
    () =>
      Effect.gen(function* () {
        const written: { record?: SanitizerRecord } = {}
        const record = DataFetchedRecord({
          runId: 'run-1',
          fetchedAt: 0,
          url: 'https://example.com/feed',
          source: { name: 'source-1', collection: 'rss' },
          http: { status: 200, contentType: 'text/html', headers: {} }, // not in allowlist
          content: { bytes: 100, sha256: 'abc123' },
          pointer: testPointer,
        })

        const result = yield* sanitizeRawObservation(
          basePolicy,
          'obs-1',
          testPointer
        ).pipe(Effect.provide(TestArchiver(record, written)))

        expect(result).toHaveLength(1)
        expect(result[0].error).toMatch(/content-type/i)
        expect(written.record?.policy).toStrictEqual({
          label: 'QUARANTINED',
          actions: ['QUARANTINED_UNEXPECTED_CONTENT_TYPE'],
        })
      })
  )

  it.effect(
    'passes record and assigns collection defaultLabel when all gates pass',
    () =>
      Effect.gen(function* () {
        const written: { record?: SanitizerRecord } = {}
        const record = DataFetchedRecord({
          runId: 'run-1',
          fetchedAt: 0,
          url: 'https://example.com/feed',
          source: { name: 'source-1', collection: 'rss' },
          http: {
            status: 200,
            contentType: 'text/xml; charset=utf-8',
            headers: {},
          },
          content: { bytes: 500, sha256: 'abc123' },
          pointer: testPointer,
        })

        const result = yield* sanitizeRawObservation(
          basePolicy,
          'obs-1',
          testPointer
        ).pipe(Effect.provide(TestArchiver(record, written)))

        expect(result).toHaveLength(1)
        expect(result[0].error).toBeUndefined()
        expect(written.record?.policy).toStrictEqual({
          label: 'SAFE_PUBLIC',
          actions: [],
        })
      })
  )

  it.effect('applies source override label over collection rule', () =>
    Effect.gen(function* () {
      const written: { record?: SanitizerRecord } = {}
      const policyWithOverride: SanitizerPolicy = {
        ...basePolicy,
        overrides: [
          {
            sourceName: 'source-1',
            defaultLabel: 'RESTRICTED', // overrides SAFE_PUBLIC from collection
          },
        ],
      }
      const record = DataFetchedRecord({
        runId: 'run-1',
        fetchedAt: 0,
        url: 'https://example.com/feed',
        source: { name: 'source-1', collection: 'rss' },
        http: { status: 200, contentType: 'text/xml', headers: {} },
        content: { bytes: 100, sha256: 'abc123' },
        pointer: testPointer,
      })

      const result = yield* sanitizeRawObservation(
        policyWithOverride,
        'obs-1',
        testPointer
      ).pipe(Effect.provide(TestArchiver(record, written)))

      expect(result).toHaveLength(1)
      expect(written.record?.policy.label).toBe('RESTRICTED')
    })
  )

  it.effect(
    'falls back to last-resort RESTRICTED rule when no collection matches',
    () =>
      Effect.gen(function* () {
        const written: { record?: SanitizerRecord } = {}
        const policyNoMatch: SanitizerPolicy = {
          version: 1,
          stripQueryParams: [],
          dropHeaders: [],
          collections: [], // no matching collection and no 'default' collection
        }
        const record = DataFetchedRecord({
          runId: 'run-1',
          fetchedAt: 0,
          url: 'https://example.com/feed',
          source: { name: 'source-1', collection: 'rss' },
          http: { status: 200, contentType: 'text/xml', headers: {} },
          content: { bytes: 100, sha256: 'abc123' },
          pointer: testPointer,
        })

        const result = yield* sanitizeRawObservation(
          policyNoMatch,
          'obs-1',
          testPointer
        ).pipe(Effect.provide(TestArchiver(record, written)))

        expect(result).toHaveLength(1)
        expect(written.record?.policy.label).toBe('RESTRICTED')
      })
  )
})
