import { describe, it } from 'vitest'
import { Schema } from 'effect'
import { expect } from '@effect/vitest'

import { FetchSuccessSchema, FetchFailureSchema } from '../ports/Fetcher'

import {
  ObservationSchema,
  ObservationMetadataSchema,
  ObservationPathSchema,
} from './Observation'

const source = {
  id: 'politifact',
  name: 'politifact.com',
  url: 'https://www.politifact.com/rss/all/',
  collection: 'rss' as const,
}

const fetchSuccess = FetchSuccessSchema.make({
  finalUrl: 'https://www.politifact.com/rss/all/',
  status: 200,
  headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  contentType: 'application/rss+xml; charset=utf-8',
  etag: '33a64df551425fcc55e4d42a148795d9f25f89d4',
  lastModified: 'Wed, 29 Apr 2026 16:20:04 GMT',
  bytes: 1024,
  sha256: 'abc123sha256',
  body: new Uint8Array(),
  error: null,
})

const fetchFailure = FetchFailureSchema.make({
  error: 'Transport error (GET https://www.politifact.com/rss/all/)',
})

describe('ObservationSchema', () => {
  it('encodes a successful fetch with pointer and all optional fields', () => {
    expect(
      Schema.encodeUnknownSync(ObservationSchema)({
        ingestorRunId: 'run-1',
        result: fetchSuccess,
        fetchedAt: 0,
        source,
        pointer: { bucket: 'my-bucket', object: 'path/to/file.bin' },
      })
    ).toStrictEqual({
      version: 1,
      kind: 'fetch_attempt',
      outcome: 'data_fetched',
      ingestor_run_id: 'run-1',
      fetched_at: 0,
      source,
      status: 200,
      headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
      content_type: 'application/rss+xml; charset=utf-8',
      etag: '33a64df551425fcc55e4d42a148795d9f25f89d4',
      last_modified: 'Wed, 29 Apr 2026 16:20:04 GMT',
      content: {
        sha256: 'abc123sha256',
        bytes: 1024,
        raw: { bucket: 'my-bucket', object: 'path/to/file.bin' },
      },
    })
  })

  it('omits content_type, etag, and last_modified when null', () => {
    const record = Schema.encodeUnknownSync(ObservationSchema)({
      ingestorRunId: 'run-1',
      result: FetchSuccessSchema.make({
        ...fetchSuccess,
        contentType: null,
        etag: null,
        lastModified: null,
      }),
      fetchedAt: 0,
      source,
      pointer: { bucket: 'my-bucket', object: 'path/to/file.bin' },
    })
    expect(record).not.toHaveProperty('content_type')
    expect(record).not.toHaveProperty('etag')
    expect(record).not.toHaveProperty('last_modified')
    expect(record.outcome).toBe('data_fetched')
  })

  it('omits content when pointer is null', () => {
    const record = Schema.encodeUnknownSync(ObservationSchema)({
      ingestorRunId: 'run-1',
      result: fetchSuccess,
      fetchedAt: 0,
      source,
      pointer: null,
    })
    expect(record).not.toHaveProperty('content')
    expect(record.outcome).toBe('data_fetched')
  })

  it('encodes a failed fetch with no_response outcome', () => {
    expect(
      Schema.encodeUnknownSync(ObservationSchema)({
        ingestorRunId: 'run-1',
        result: fetchFailure,
        fetchedAt: 0,
        source,
        pointer: null,
      })
    ).toStrictEqual({
      version: 1,
      kind: 'fetch_attempt',
      outcome: 'no_response',
      ingestor_run_id: 'run-1',
      fetched_at: 0,
      source,
      error: 'Transport error (GET https://www.politifact.com/rss/all/)',
    })
  })
})

describe('ObservationMetadataSchema', () => {
  it('encodes metadata from a successful fetch observation', () => {
    expect(
      Schema.encodeUnknownSync(ObservationMetadataSchema)({
        ingestorRunId: 'run-1',
        result: fetchSuccess,
        fetchedAt: 0,
        source,
        pointer: null,
      })
    ).toStrictEqual({
      ingestorRunId: 'run-1',
      fetchedAt: '0',
      url: 'https://www.politifact.com/rss/all/',
      sourceName: 'politifact.com',
      sourceCollection: 'rss',
    })
  })

  it('encodes metadata from a failed fetch observation', () => {
    expect(
      Schema.encodeUnknownSync(ObservationMetadataSchema)({
        ingestorRunId: 'run-1',
        result: fetchFailure,
        fetchedAt: 0,
        source,
        pointer: null,
      })
    ).toStrictEqual({
      ingestorRunId: 'run-1',
      fetchedAt: '0',
      url: 'https://www.politifact.com/rss/all/',
      sourceName: 'politifact.com',
      sourceCollection: 'rss',
    })
  })
})

describe('ObservationPathSchema', () => {
  it('encodes to a records archive path from a successful fetch', () => {
    expect(
      Schema.encodeUnknownSync(ObservationPathSchema)({
        ingestorRunId: 'run-1',
        result: fetchSuccess,
        fetchedAt: 0,
        source,
        pointer: null,
      })
    ).toBe(
      'v1/records/ingestion/source=politifact/date=1970-01-01/ingestor_run_id=run-1/fetch_attempt.yml'
    )
  })

  it('encodes to a records archive path from a failed fetch', () => {
    expect(
      Schema.encodeUnknownSync(ObservationPathSchema)({
        ingestorRunId: 'run-1',
        result: fetchFailure,
        fetchedAt: 0,
        source,
        pointer: null,
      })
    ).toBe(
      'v1/records/ingestion/source=politifact/date=1970-01-01/ingestor_run_id=run-1/fetch_attempt.yml'
    )
  })
})
