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
import { Archive } from '../ports'
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
    'writes sanitizer record and returns SanitizationAttempted event for data_fetched records',
    () =>
      Effect.gen(function* () {
        const written: {
          record?: SanitizerRecord
          metadata?: SanitizerRecordMetadata
        } = {}
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
          basePolicy,
          'obs-1',
          testPointer
        ).pipe(Effect.provide(TestArchiver(record, written)))

        expect(result).toHaveLength(1)
        expect(result[0].observationId).toBe('obs-1')
        expect(result[0].runId).toBe('run-1')
        expect(written.record).toBeDefined()
        expect(written.metadata).toBeDefined()
      })
  )
})
