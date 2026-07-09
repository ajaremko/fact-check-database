import { describe, it } from 'vitest'
import { Schema } from 'effect'
import { expect } from '@effect/vitest'

import {
  ObservationSchema,
  ObservationMetadataSchema,
  ObservationPathSchema,
  ObservationEventSchema,
} from './Observation'
import { FetchSuccessSchema, FetchFailureSchema } from '../ports/Fetcher'

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
        observationId: 'obs-1',
        ingestionId: 'run-1',
        result: fetchSuccess,
        fetchedAt: 0,
        source,
        pointer: { bucket: 'my-bucket', object: 'path/to/file.bin' },
      })
    ).toStrictEqual({
      version: 1,
      kind: 'fetch_attempt',
      outcome: 'data_fetched',
      content_lineage_id: 'obs-1',
      ingestion_batch_id: 'run-1',
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
      observationId: 'obs-1',
      ingestionId: 'run-1',
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
      observationId: 'obs-1',
      ingestionId: 'run-1',
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
        observationId: 'obs-1',
        ingestionId: 'run-1',
        result: fetchFailure,
        fetchedAt: 0,
        source,
        pointer: null,
      })
    ).toStrictEqual({
      version: 1,
      kind: 'fetch_attempt',
      outcome: 'no_response',
      content_lineage_id: 'obs-1',
      ingestion_batch_id: 'run-1',
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
        observationId: 'obs-1',
        ingestionId: 'run-1',
        result: fetchSuccess,
        fetchedAt: 0,
        source,
        pointer: null,
      })
    ).toStrictEqual({
      observationId: 'obs-1',
      ingestionId: 'run-1',
      fetchedAt: '0',
      url: 'https://www.politifact.com/rss/all/',
      sourceName: 'politifact.com',
      sourceCollection: 'rss',
    })
  })

  it('encodes metadata from a failed fetch observation', () => {
    expect(
      Schema.encodeUnknownSync(ObservationMetadataSchema)({
        observationId: 'obs-1',
        ingestionId: 'run-1',
        result: fetchFailure,
        fetchedAt: 0,
        source,
        pointer: null,
      })
    ).toStrictEqual({
      observationId: 'obs-1',
      ingestionId: 'run-1',
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
        observationId: 'obs-1',
        ingestionId: 'run-1',
        result: fetchSuccess,
        fetchedAt: 0,
        source,
        pointer: null,
      })
    ).toBe(
      'v1/records/source=politifact.com/date=1970-01-01/ingestion_id=run-1/obs-1.ingestion.yml'
    )
  })

  it('encodes to a records archive path from a failed fetch', () => {
    expect(
      Schema.encodeUnknownSync(ObservationPathSchema)({
        observationId: 'obs-1',
        ingestionId: 'run-1',
        result: fetchFailure,
        fetchedAt: 0,
        source,
        pointer: null,
      })
    ).toBe(
      'v1/records/source=politifact.com/date=1970-01-01/ingestion_id=run-1/obs-1.ingestion.yml'
    )
  })
})

describe('buildEventFromObservation', () => {
  it('builds a success event including all optional fields', () => {
    expect(
      Schema.encodeUnknownSync(ObservationEventSchema)({
        observation: {
          observationId: 'obs-1',
          ingestionId: 'run-1',
          result: fetchSuccess,
          fetchedAt: 0,
          source,
          pointer: { bucket: 'my-bucket', object: 'path/to/file.bin' },
        },
        pointer: { bucket: 'records-bucket', object: 'path/to/record.yml' },
      })
    ).toStrictEqual({
      version: 1,
      content_lineage_id: 'obs-1',
      ingestion_batch_id: 'run-1',
      fetched_at: 0,
      source,
      status: 200,
      final_url: 'https://www.politifact.com/rss/all/',
      content_type: 'application/rss+xml; charset=utf-8',
      etag: '33a64df551425fcc55e4d42a148795d9f25f89d4',
      last_modified: 'Wed, 29 Apr 2026 16:20:04 GMT',
      content_sha256: 'abc123sha256',
      content_bytes: 1024,
      pointer: { bucket: 'records-bucket', object: 'path/to/record.yml' },
    })
  })

  it('omits content_type, etag, and last_modified from event when null', () => {
    const event = Schema.encodeUnknownSync(ObservationEventSchema)({
      observation: {
        observationId: 'obs-1',
        ingestionId: 'run-1',
        fetchedAt: 0,
        result: {
          ...fetchSuccess,
          contentType: null,
          etag: null,
          lastModified: null,
        },
        source,
        pointer: { bucket: 'my-bucket', object: 'path/to/file.bin' },
      },
      pointer: { bucket: 'records-bucket', object: 'path/to/record.yml' },
    })
    expect(event).not.toHaveProperty('content_type')
    expect(event).not.toHaveProperty('etag')
    expect(event).not.toHaveProperty('last_modified')
    expect(event.content_sha256).toBe('abc123sha256')
    expect(event.content_bytes).toBe(1024)
  })

  it('builds a failure event with error and no content fields', () => {
    expect(
      Schema.encodeUnknownSync(ObservationEventSchema)({
        observation: {
          observationId: 'obs-1',
          ingestionId: 'run-1',
          fetchedAt: 0,
          result: fetchFailure,
          source,
          pointer: null,
        },
        pointer: { bucket: 'records-bucket', object: 'path/to/record.yml' },
      })
    ).toStrictEqual({
      version: 1,
      content_lineage_id: 'obs-1',
      ingestion_batch_id: 'run-1',
      fetched_at: 0,
      source,
      error: 'Transport error (GET https://www.politifact.com/rss/all/)',
      pointer: { bucket: 'records-bucket', object: 'path/to/record.yml' },
    })
  })
})
