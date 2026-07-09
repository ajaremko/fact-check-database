import { describe, it, expect } from 'vitest'

import { TimestampBrand } from '@news-research/ingestion-contracts'

import { evaluatePolicy, pickRule } from './evaluatePolicy'
import { Observation } from './Observation'
import { SanitizerPolicy } from '../contracts/SanitizerPolicy'

describe('evaluatePolicy', () => {
  it('quarantines with QUARANTINED_FETCH_FAILED when record is not data_fetched', () => {
    const decision = evaluatePolicy(
      new SanitizerPolicy({
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
      }),
      new Observation({
        observationId: 'obs-1',
        ingestionId: 'ingest-1',
        fetchedAt: TimestampBrand(0),
        source: {
          id: 'source-1',
          name: 'source-1',
          collection: 'rss',
          url: 'https://example.com/feed',
        },
        error: 'Network error',
        raw: null,
      })
    )
    expect(decision).toStrictEqual({
      actions: ['QUARANTINED_FETCH_FAILED'],
      error: null,
      label: 'QUARANTINED',
      rewriteBody: false,
    })
  })

  it('quarantines with QUARANTINED_TOO_LARGE when body exceeds maxBytes', () => {
    const decision = evaluatePolicy(
      new SanitizerPolicy({
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
      }),
      new Observation({
        ingestionId: 'run-1',
        observationId: 'obs-1',
        fetchedAt: TimestampBrand(0),
        error: null,
        source: {
          id: 'source-1',
          name: 'source-1',
          collection: 'rss',
          url: 'https://example.com/feed',
        },
        raw: {
          http: {
            finalUrl: null,
            etag: null,
            lastModified: null,
            status: 200,
            contentType: 'text/xml',
            headers: {},
          },
          content: { bytes: 2_000, sha256: 'abc123' }, // exceeds maxBytes: 1_000
          pointer: {
            bucket: 'test-bucket',
            object: 'records/path/record.yml',
          },
        },
      })
    )
    expect(decision).toStrictEqual({
      actions: ['QUARANTINED_TOO_LARGE'],
      error: 'Body too large: 2000 > 1000',
      label: 'QUARANTINED',
      rewriteBody: false,
    })
  })

  it('quarantines with QUARANTINED_UNEXPECTED_CONTENT_TYPE when content-type is not in allowlist', () => {
    const decision = evaluatePolicy(
      new SanitizerPolicy({
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
      }),
      new Observation({
        ingestionId: 'run-1',
        observationId: 'obs-1',
        fetchedAt: TimestampBrand(0),
        error: null,
        source: {
          id: 'source-1',
          url: 'https://example.com/feed',
          name: 'source-1',
          collection: 'rss',
        },
        raw: {
          http: {
            finalUrl: null,
            etag: null,
            lastModified: null,
            status: 200,
            contentType: 'text/html',
            headers: {},
          },
          content: { bytes: 100, sha256: 'abc123' },
          pointer: {
            bucket: 'test-bucket',
            object: 'records/path/record.yml',
          },
        },
      })
    )
    expect(decision).toStrictEqual({
      actions: ['QUARANTINED_UNEXPECTED_CONTENT_TYPE'],
      error: 'Unexpected content-type: text/html',
      label: 'QUARANTINED',
      rewriteBody: false,
    })
  })

  it('assigns collection defaultLabel when all gates pass', () => {
    const decision = evaluatePolicy(
      new SanitizerPolicy({
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
      }),
      new Observation({
        ingestionId: 'run-1',
        observationId: 'obs-1',
        fetchedAt: TimestampBrand(0),
        error: null,
        source: {
          id: 'source-1',
          url: 'https://example.com/feed',
          name: 'source-1',
          collection: 'rss',
        },
        raw: {
          http: {
            finalUrl: null,
            etag: null,
            lastModified: null,
            status: 200,
            contentType: 'text/xml; charset=utf-8',
            headers: {},
          },
          content: { bytes: 500, sha256: 'abc123' },
          pointer: {
            bucket: 'test-bucket',
            object: 'records/path/record.yml',
          },
        },
      })
    )
    expect(decision).toStrictEqual({
      actions: [],
      label: 'SAFE_PUBLIC',
      rewriteBody: false,
      error: null,
    })
  })

  it('applies source override label over collection rule', () => {
    const decision = evaluatePolicy(
      new SanitizerPolicy({
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
        overrides: [{ sourceName: 'source-1', defaultLabel: 'RESTRICTED' }],
      }),
      new Observation({
        ingestionId: 'run-1',
        observationId: 'obs-1',
        fetchedAt: TimestampBrand(0),
        error: null,
        source: {
          id: 'source-1',
          url: 'https://example.com/feed',
          name: 'source-1',
          collection: 'rss',
        },
        raw: {
          http: {
            finalUrl: null,
            etag: null,
            lastModified: null,
            status: 200,
            contentType: 'text/xml',
            headers: {},
          },
          content: { bytes: 100, sha256: 'abc123' },
          pointer: {
            bucket: 'test-bucket',
            object: 'records/path/record.yml',
          },
        },
      })
    )
    expect(decision).toStrictEqual({
      actions: [],
      label: 'RESTRICTED', // override label takes precedence
      rewriteBody: false,
      error: null,
    })
  })

  it('falls back to last-resort RESTRICTED rule when no collection matches', () => {
    const decision = evaluatePolicy(
      new SanitizerPolicy({
        version: 1,
        stripQueryParams: [],
        dropHeaders: [],
        collections: [],
      }),
      new Observation({
        ingestionId: 'run-1',
        observationId: 'obs-1',
        fetchedAt: TimestampBrand(0),
        error: null,
        source: {
          id: 'source-1',
          url: 'https://example.com/feed',
          name: 'source-1',
          collection: 'rss',
        },
        raw: {
          http: {
            etag: null,
            finalUrl: null,
            lastModified: null,
            status: 200,
            contentType: 'text/xml',
            headers: {},
          },
          content: { bytes: 100, sha256: 'abc123' },
          pointer: {
            bucket: 'test-bucket',
            object: 'records/path/record.yml',
          },
        },
      })
    )
    expect(decision).toStrictEqual({
      label: 'RESTRICTED',
      actions: [],
      rewriteBody: false,
      error: null,
    })
  })
})

describe('pickRule', () => {
  it('returns the matching collection rule', () => {
    const rule = pickRule(
      new SanitizerPolicy({
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
      }),
      { collection: 'rss', name: 'any-source' }
    )
    expect(rule).toStrictEqual({
      collection: 'rss',
      maxBytes: 1_000,
      defaultLabel: 'SAFE_PUBLIC',
      allowedContentTypeSubstrings: ['text/xml', 'application/rss'],
      onMissingContentType: 'RESTRICT',
      rewriteBody: false,
    })
  })

  it('falls back to the default collection rule when no exact match', () => {
    const rule = pickRule(
      new SanitizerPolicy({
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
          { collection: 'default', maxBytes: 500, defaultLabel: 'RESTRICTED' },
        ],
      }),
      { collection: 'unknown-collection' as 'rss', name: 'any-source' }
    )
    expect(rule).toStrictEqual({
      collection: 'default',
      maxBytes: 500,
      defaultLabel: 'RESTRICTED',
      allowedContentTypeSubstrings: [],
      onMissingContentType: 'RESTRICT',
      rewriteBody: false,
    })
  })

  it('merges source override fields over the base collection rule', () => {
    const rule = pickRule(
      new SanitizerPolicy({
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
        overrides: [
          {
            sourceName: 'special-source',
            maxBytes: 50,
            defaultLabel: 'RESTRICTED',
          },
        ],
      }),
      { collection: 'rss', name: 'special-source' }
    )
    expect(rule).toStrictEqual({
      collection: 'rss',
      maxBytes: 50, // overridden
      defaultLabel: 'RESTRICTED', // overridden
      allowedContentTypeSubstrings: ['text/xml', 'application/rss'], // from base rule
      onMissingContentType: 'RESTRICT',
      rewriteBody: false,
    })
  })

  it('returns base rule with defaults when source has no override', () => {
    const rule = pickRule(
      new SanitizerPolicy({
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
      }),
      { collection: 'rss', name: 'unrecognised-source' }
    )
    expect(rule).toStrictEqual({
      collection: 'rss',
      maxBytes: 1_000,
      defaultLabel: 'SAFE_PUBLIC',
      allowedContentTypeSubstrings: ['text/xml', 'application/rss'],
      onMissingContentType: 'RESTRICT',
      rewriteBody: false,
    })
  })
})
