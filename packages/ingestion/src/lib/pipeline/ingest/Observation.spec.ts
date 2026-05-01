import { expect } from '@effect/vitest'
import { Schema } from 'effect'

import {
  Observation,
  ObservationSchema,
  ObservationMetadataSchema,
  ObservationPathSchema,
  buildEventFromObservation,
} from './Observation'
import { FetchSuccessSchema, FetchFailureSchema } from './FetchResult'
import { TimestampBrand } from '../shared'

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
    const observation = new Observation({
      observationId: 'obs-1',
      ingestionId: 'run-1',
      result: fetchSuccess,
      fetchedAt: TimestampBrand(0),
      source,
      pointer: { bucket: 'my-bucket', object: 'path/to/file.bin' },
    })

    expect(Schema.encodeSync(ObservationSchema)(observation)).toStrictEqual({
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
    const observation = new Observation({
      observationId: 'obs-1',
      ingestionId: 'run-1',
      result: FetchSuccessSchema.make({
        ...fetchSuccess,
        contentType: null,
        etag: null,
        lastModified: null,
      }),
      fetchedAt: TimestampBrand(0),
      source,
      pointer: { bucket: 'my-bucket', object: 'path/to/file.bin' },
    })

    const record = Schema.encodeSync(ObservationSchema)(observation)
    expect(record).not.toHaveProperty('content_type')
    expect(record).not.toHaveProperty('etag')
    expect(record).not.toHaveProperty('last_modified')
    expect(record.outcome).toBe('data_fetched')
  })

  it('omits content when pointer is null', () => {
    const observation = new Observation({
      observationId: 'obs-1',
      ingestionId: 'run-1',
      result: fetchSuccess,
      fetchedAt: TimestampBrand(0),
      source,
      pointer: null,
    })

    const record = Schema.encodeSync(ObservationSchema)(observation)
    expect(record).not.toHaveProperty('content')
    expect(record.outcome).toBe('data_fetched')
  })

  it('encodes a failed fetch with no_response outcome', () => {
    const observation = new Observation({
      observationId: 'obs-1',
      ingestionId: 'run-1',
      result: fetchFailure,
      fetchedAt: TimestampBrand(0),
      source,
      pointer: null,
    })

    expect(Schema.encodeSync(ObservationSchema)(observation)).toStrictEqual({
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
    const observation = new Observation({
      observationId: 'obs-1',
      ingestionId: 'run-1',
      result: fetchSuccess,
      fetchedAt: TimestampBrand(0),
      source,
      pointer: null,
    })

    expect(
      Schema.encodeSync(ObservationMetadataSchema)(observation)
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
    const observation = new Observation({
      observationId: 'obs-1',
      ingestionId: 'run-1',
      result: fetchFailure,
      fetchedAt: TimestampBrand(0),
      source,
      pointer: null,
    })

    expect(
      Schema.encodeSync(ObservationMetadataSchema)(observation)
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
    const observation = new Observation({
      observationId: 'obs-1',
      ingestionId: 'run-1',
      result: fetchSuccess,
      fetchedAt: TimestampBrand(0),
      source,
      pointer: null,
    })

    expect(Schema.encodeSync(ObservationPathSchema)(observation)).toBe(
      'v1/records/source=politifact.com/date=1970-01-01/ingestion_id=run-1/obs-1.ingestion.yml'
    )
  })

  it('encodes to a records archive path from a failed fetch', () => {
    const observation = new Observation({
      observationId: 'obs-1',
      ingestionId: 'run-1',
      result: fetchFailure,
      fetchedAt: TimestampBrand(0),
      source,
      pointer: null,
    })

    expect(Schema.encodeSync(ObservationPathSchema)(observation)).toBe(
      'v1/records/source=politifact.com/date=1970-01-01/ingestion_id=run-1/obs-1.ingestion.yml'
    )
  })
})

describe('buildEventFromObservation', () => {
  const pointer = { bucket: 'records-bucket', object: 'path/to/record.yml' }

  it('builds a success event including all optional fields', () => {
    const observation = new Observation({
      observationId: 'obs-1',
      ingestionId: 'run-1',
      result: fetchSuccess,
      fetchedAt: TimestampBrand(0),
      source,
      pointer: { bucket: 'my-bucket', object: 'path/to/file.bin' },
    })

    expect(buildEventFromObservation(observation, pointer)).toStrictEqual({
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
      pointer,
    })
  })

  it('omits content_type, etag, and last_modified from event when null', () => {
    const observation = new Observation({
      observationId: 'obs-1',
      ingestionId: 'run-1',
      fetchedAt: TimestampBrand(0),
      result: FetchSuccessSchema.make({
        ...fetchSuccess,
        contentType: null,
        etag: null,
        lastModified: null,
      }),
      source,
      pointer: { bucket: 'my-bucket', object: 'path/to/file.bin' },
    })

    const event = buildEventFromObservation(observation, pointer)
    expect(event).not.toHaveProperty('content_type')
    expect(event).not.toHaveProperty('etag')
    expect(event).not.toHaveProperty('last_modified')
    expect(event.content_sha256).toBe('abc123sha256')
    expect(event.content_bytes).toBe(1024)
  })

  it('builds a failure event with error and no content fields', () => {
    const observation = new Observation({
      observationId: 'obs-1',
      ingestionId: 'run-1',
      fetchedAt: TimestampBrand(0),
      result: fetchFailure,
      source,
      pointer: null,
    })

    expect(buildEventFromObservation(observation, pointer)).toStrictEqual({
      version: 1,
      content_lineage_id: 'obs-1',
      ingestion_batch_id: 'run-1',
      fetched_at: 0,
      source,
      error: 'Transport error (GET https://www.politifact.com/rss/all/)',
      pointer,
    })
  })
})
