import { describe, it, expect } from 'vitest'

import { evaluatePolicy, pickRule } from './evaluatePolicy'

describe('evaluatePolicy', () => {
  it('quarantines with QUARANTINED_FETCH_FAILED when record is not data_fetched', () => {
    const decision = evaluatePolicy({
      record: {
        version: 1,
        kind: 'fetch_attempt',
        outcome: 'no_response',
        runId: 'run-1',
        fetchedAt: 0,
        url: 'https://example.com/feed',
        source: { name: 'source-1', collection: 'rss' },
        error: 'Network error',
      },
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
    })
    expect(decision).toStrictEqual({
      actions: ['QUARANTINED_FETCH_FAILED'],
      error: 'Network error',
      label: 'QUARANTINED',
      rewriteBody: false,
    })
  })

  it('quarantines with QUARANTINED_TOO_LARGE when body exceeds maxBytes', () => {
    const decision = evaluatePolicy({
      record: {
        version: 1,
        kind: 'fetch_attempt',
        outcome: 'data_fetched',
        runId: 'run-1',
        fetchedAt: 0,
        url: 'https://example.com/feed',
        source: { name: 'source-1', collection: 'rss' },
        http: { status: 200, contentType: 'text/xml', headers: {} },
        content: { bytes: 2_000, sha256: 'abc123' }, // exceeds maxBytes: 1_000
        pointer: {
          bucket: 'test-bucket',
          object: 'records/path/record.yml',
        },
      },
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
    })
    expect(decision).toStrictEqual({
      actions: ['QUARANTINED_TOO_LARGE'],
      error: 'Body too large: 2000 > 1000',
      label: 'QUARANTINED',
      rewriteBody: false,
    })
  })

  it('quarantines with QUARANTINED_UNEXPECTED_CONTENT_TYPE when content-type is not in allowlist', () => {
    const decision = evaluatePolicy({
      record: {
        version: 1,
        kind: 'fetch_attempt',
        outcome: 'data_fetched',
        runId: 'run-1',
        fetchedAt: 0,
        url: 'https://example.com/feed',
        source: { name: 'source-1', collection: 'rss' },
        http: { status: 200, contentType: 'text/html', headers: {} },
        content: { bytes: 100, sha256: 'abc123' },
        pointer: {
          bucket: 'test-bucket',
          object: 'records/path/record.yml',
        },
      },
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
    })
    expect(decision).toStrictEqual({
      actions: ['QUARANTINED_UNEXPECTED_CONTENT_TYPE'],
      error: 'Unexpected content-type: text/html',
      label: 'QUARANTINED',
      rewriteBody: false,
    })
  })

  it('assigns collection defaultLabel when all gates pass', () => {
    const decision = evaluatePolicy({
      record: {
        version: 1,
        kind: 'fetch_attempt',
        outcome: 'data_fetched',
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
        pointer: {
          bucket: 'test-bucket',
          object: 'records/path/record.yml',
        },
      },
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
    })
    expect(decision).toStrictEqual({
      actions: [],
      label: 'SAFE_PUBLIC',
      rewriteBody: false,
    })
  })

  it('applies source override label over collection rule', () => {
    const decision = evaluatePolicy({
      record: {
        version: 1,
        kind: 'fetch_attempt',
        outcome: 'data_fetched',
        runId: 'run-1',
        fetchedAt: 0,
        url: 'https://example.com/feed',
        source: { name: 'source-1', collection: 'rss' },
        http: { status: 200, contentType: 'text/xml', headers: {} },
        content: { bytes: 100, sha256: 'abc123' },
        pointer: {
          bucket: 'test-bucket',
          object: 'records/path/record.yml',
        },
      },
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
        overrides: [{ sourceName: 'source-1', defaultLabel: 'RESTRICTED' }],
      },
    })
    expect(decision).toStrictEqual({
      actions: [],
      label: 'RESTRICTED', // override label takes precedence
      rewriteBody: false,
    })
  })

  it('falls back to last-resort RESTRICTED rule when no collection matches', () => {
    const decision = evaluatePolicy({
      policy: {
        version: 1,
        stripQueryParams: [],
        dropHeaders: [],
        collections: [],
      },
      record: {
        version: 1,
        kind: 'fetch_attempt',
        outcome: 'data_fetched',
        runId: 'run-1',
        fetchedAt: 0,
        url: 'https://example.com/feed',
        source: { name: 'source-1', collection: 'rss' },
        http: { status: 200, contentType: 'text/xml', headers: {} },
        content: { bytes: 100, sha256: 'abc123' },
        pointer: {
          bucket: 'test-bucket',
          object: 'records/path/record.yml',
        },
      },
    })
    expect(decision).toStrictEqual({
      label: 'RESTRICTED',
      actions: [],
      rewriteBody: false,
    })
  })
})

describe('pickRule', () => {
  it('returns the matching collection rule', () => {
    const rule = pickRule({
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
      source: { collection: 'rss', name: 'any-source' },
    })
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
    const rule = pickRule({
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
          { collection: 'default', maxBytes: 500, defaultLabel: 'RESTRICTED' },
        ],
      },
      source: { collection: 'unknown-collection', name: 'any-source' },
    })
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
    const rule = pickRule({
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
        overrides: [
          {
            sourceName: 'special-source',
            maxBytes: 50,
            defaultLabel: 'RESTRICTED',
          },
        ],
      },
      source: { collection: 'rss', name: 'special-source' },
    })
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
    const rule = pickRule({
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
      source: { collection: 'rss', name: 'unrecognised-source' },
    })
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
