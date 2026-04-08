import { describe, it, expect } from 'vitest'
import { Schema } from 'effect'

import {
  DataFetchedRecord,
  NoResponseRecord,
  IngestionRecordSchema,
  IngestionRecordMetadataSchema,
} from './IngestorRecord'

describe('DataFetchedRecord', () => {
  it('supplies version, kind, and outcome discriminators', () => {
    const record = DataFetchedRecord({
      runId: 'r1',
      fetchedAt: 0,
      url: 'https://example.com',
      source: { name: 's1', collection: 'rss' },
      http: { status: 200, headers: {} },
      content: {},
      pointer: { bucket: 'b', object: 'o' },
    })

    expect(record.version).toBe(1)
    expect(record.kind).toBe('fetch_attempt')
    expect(record.outcome).toBe('data_fetched')
  })

  it('preserves caller-supplied fields', () => {
    const record = DataFetchedRecord({
      runId: 'run-99',
      fetchedAt: 1000,
      url: 'https://example.com/feed',
      source: { name: 'my-source', collection: 'csv' },
      http: { status: 200, contentType: 'text/csv', headers: {} },
      content: { bytes: 512, sha256: 'deadbeef' },
      pointer: { bucket: 'my-bucket', object: 'path/record.yml' },
    })

    expect(record.runId).toBe('run-99')
    expect(record.source.name).toBe('my-source')
    expect(record.content.sha256).toBe('deadbeef')
  })
})

describe('NoResponseRecord', () => {
  it('supplies version, kind, and outcome discriminators', () => {
    const record = NoResponseRecord({
      runId: 'r1',
      fetchedAt: 0,
      url: 'https://example.com',
      source: { name: 's1', collection: 'rss' },
      error: 'timeout',
    })

    expect(record.version).toBe(1)
    expect(record.kind).toBe('fetch_attempt')
    expect(record.outcome).toBe('no_response')
  })

  it('preserves the error message', () => {
    const record = NoResponseRecord({
      runId: 'r1',
      fetchedAt: 0,
      url: 'https://example.com',
      source: { name: 's1', collection: 'rss' },
      error: 'DNS resolution failed',
    })

    expect(record.error).toBe('DNS resolution failed')
  })
})

describe('IngestionRecordSchema', () => {
  it('decodes a DataFetchedRecord payload via outcome discriminator', () => {
    const input = {
      version: 1,
      kind: 'fetch_attempt',
      outcome: 'data_fetched',
      runId: 'r1',
      fetchedAt: 0,
      url: 'https://example.com',
      source: { name: 's1', collection: 'rss' },
      http: { status: 200, headers: {} },
      content: {},
      pointer: { bucket: 'b', object: 'o' },
    }

    const result = Schema.decodeUnknownSync(IngestionRecordSchema)(input)
    expect(result.outcome).toBe('data_fetched')
  })

  it('decodes a NoResponseRecord payload via outcome discriminator', () => {
    const input = {
      version: 1,
      kind: 'fetch_attempt',
      outcome: 'no_response',
      runId: 'r1',
      fetchedAt: 0,
      url: 'https://example.com',
      source: { name: 's1', collection: 'rss' },
      error: 'timeout',
    }

    const result = Schema.decodeUnknownSync(IngestionRecordSchema)(input)
    expect(result.outcome).toBe('no_response')
  })

  it('rejects an unknown outcome value', () => {
    expect(() =>
      Schema.decodeUnknownSync(IngestionRecordSchema)({ outcome: 'unknown' })
    ).toThrow()
  })
})

describe('IngestionRecordMetadataSchema', () => {
  const validInput = {
    url: 'https://example.com',
    sourceName: 's1',
    sourceCollection: 'rss',
    runId: 'r1',
    fetchedAt: '1744113600000',
    id: 'abc',
  }

  it('decodes fetchedAt from string to number', () => {
    const result = Schema.decodeUnknownSync(IngestionRecordMetadataSchema)(validInput)
    expect(result.fetchedAt).toBe(1744113600000)
    expect(typeof result.fetchedAt).toBe('number')
  })

  it('encodes fetchedAt from number back to string', () => {
    const input = { ...validInput, fetchedAt: 1744113600000 }
    const result = Schema.encodeSync(IngestionRecordMetadataSchema)(input)
    expect(result.fetchedAt).toBe('1744113600000')
  })
})
