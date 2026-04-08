import { describe, it, expect } from 'vitest'

import { DataFetchedRecord, NoResponseRecord } from '../data'
import type { SanitizerPolicy } from './SanitizerPolicy'
import { evaluatePolicy, pickRule } from './evaluatePolicy'

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

const testPointer = {
  bucket: 'test-bucket',
  object: 'records/path/record.yml',
}

describe('evaluatePolicy', () => {
  it('quarantines with QUARANTINED_FETCH_FAILED when record is not data_fetched', () => {
    const record = NoResponseRecord({
      runId: 'run-1',
      fetchedAt: 0,
      url: 'https://example.com/feed',
      source: { name: 'source-1', collection: 'rss' },
      error: 'Network error',
    })

    const decision = evaluatePolicy(basePolicy, record)

    expect(decision.label).toBe('QUARANTINED')
    expect(decision.actions).toStrictEqual(['QUARANTINED_FETCH_FAILED'])
    expect(decision.error).toBe('Network error')
  })

  it('quarantines with QUARANTINED_TOO_LARGE when body exceeds maxBytes', () => {
    const record = DataFetchedRecord({
      runId: 'run-1',
      fetchedAt: 0,
      url: 'https://example.com/feed',
      source: { name: 'source-1', collection: 'rss' },
      http: { status: 200, contentType: 'text/xml', headers: {} },
      content: { bytes: 2_000, sha256: 'abc123' }, // exceeds maxBytes: 1_000
      pointer: testPointer,
    })

    const decision = evaluatePolicy(basePolicy, record)

    expect(decision.label).toBe('QUARANTINED')
    expect(decision.actions).toStrictEqual(['QUARANTINED_TOO_LARGE'])
    expect(decision.error).toMatch(/too large/i)
  })

  it('quarantines with QUARANTINED_UNEXPECTED_CONTENT_TYPE when content-type is not in allowlist', () => {
    const record = DataFetchedRecord({
      runId: 'run-1',
      fetchedAt: 0,
      url: 'https://example.com/feed',
      source: { name: 'source-1', collection: 'rss' },
      http: { status: 200, contentType: 'text/html', headers: {} },
      content: { bytes: 100, sha256: 'abc123' },
      pointer: testPointer,
    })

    const decision = evaluatePolicy(basePolicy, record)

    expect(decision.label).toBe('QUARANTINED')
    expect(decision.actions).toStrictEqual(['QUARANTINED_UNEXPECTED_CONTENT_TYPE'])
    expect(decision.error).toMatch(/content-type/i)
  })

  it('assigns collection defaultLabel when all gates pass', () => {
    const record = DataFetchedRecord({
      runId: 'run-1',
      fetchedAt: 0,
      url: 'https://example.com/feed',
      source: { name: 'source-1', collection: 'rss' },
      http: { status: 200, contentType: 'text/xml; charset=utf-8', headers: {} },
      content: { bytes: 500, sha256: 'abc123' },
      pointer: testPointer,
    })

    const decision = evaluatePolicy(basePolicy, record)

    expect(decision.label).toBe('SAFE_PUBLIC')
    expect(decision.actions).toStrictEqual([])
    expect(decision.error).toBeUndefined()
  })

  it('applies source override label over collection rule', () => {
    const policyWithOverride: SanitizerPolicy = {
      ...basePolicy,
      overrides: [{ sourceName: 'source-1', defaultLabel: 'RESTRICTED' }],
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

    const decision = evaluatePolicy(policyWithOverride, record)

    expect(decision.label).toBe('RESTRICTED')
  })

  it('falls back to last-resort RESTRICTED rule when no collection matches', () => {
    const policyNoMatch: SanitizerPolicy = {
      version: 1,
      stripQueryParams: [],
      dropHeaders: [],
      collections: [],
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

    const decision = evaluatePolicy(policyNoMatch, record)

    expect(decision.label).toBe('RESTRICTED')
  })
})

describe('pickRule', () => {
  it('returns the matching collection rule', () => {
    const rule = pickRule(basePolicy, 'rss', 'any-source')

    expect(rule.collection).toBe('rss')
    expect(rule.maxBytes).toBe(1_000)
    expect(rule.defaultLabel).toBe('SAFE_PUBLIC')
  })

  it('falls back to the default collection rule when no exact match', () => {
    const policyWithDefault: SanitizerPolicy = {
      ...basePolicy,
      collections: [
        ...basePolicy.collections,
        { collection: 'default', maxBytes: 500, defaultLabel: 'RESTRICTED' },
      ],
    }

    const rule = pickRule(policyWithDefault, 'unknown-collection', 'any-source')

    expect(rule.collection).toBe('default')
    expect(rule.defaultLabel).toBe('RESTRICTED')
  })

  it('merges source override fields over the base collection rule', () => {
    const policyWithOverride: SanitizerPolicy = {
      ...basePolicy,
      overrides: [
        {
          sourceName: 'special-source',
          maxBytes: 50,
          defaultLabel: 'RESTRICTED',
        },
      ],
    }

    const rule = pickRule(policyWithOverride, 'rss', 'special-source')

    expect(rule.maxBytes).toBe(50)
    expect(rule.defaultLabel).toBe('RESTRICTED')
    // Non-overridden fields come from the base collection rule
    expect(rule.allowedContentTypeSubstrings).toStrictEqual(['text/xml', 'application/rss'])
  })

  it('returns base rule unchanged when source has no override', () => {
    const rule = pickRule(basePolicy, 'rss', 'unrecognised-source')

    expect(rule).toStrictEqual(basePolicy.collections[0])
  })
})
