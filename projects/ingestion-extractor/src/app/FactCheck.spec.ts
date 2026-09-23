import { describe, it, expect } from 'vitest'
import { Schema } from 'effect'

import { FactCheckRowSchema } from './FactCheck'

describe('FactCheckRowSchema', () => {
  it('encodes to bigquery row', () => {
    expect(
      Schema.encodeUnknownSync(FactCheckRowSchema)({
        factCheckId: 'fact-check-id',
        ingestorRunId: 'ingestor-run-id',
        extractorRunId: 'extractor-run-id',
        extractedAt: 0,
        fetchedAt: 0,
        extractor: {
          id: 'extractor-id',
          version: 1,
        },
        factCheck: {
          sha256: 'abc123',
          guid: 'https://example.com/fact-check',
          title: 'A fact check title',
          author: 'Jane Doe',
          categories: ['politics', 'elections'],
          link: 'https://example.com/link',
          summary: 'Summary of findings',
          content: 'Full article body',
          language: 'en',
          enclosureUrl: 'https://example.com/video.mp4',
          imageUrl: 'https://example.com/hero.png',
          publishedAtRaw: '2024-01-01',
          publishedAtNormalized: new Date('2024-01-01'),
          canonicalUrl: 'https://example.com/fact-check',
        },
        http: {
          contentSha256: 'sha256abc',
          status: 200,
          finalUrl: 'https://example.com/final',
          contentType: 'text/html',
          etag: '"etag123"',
          lastModified: 'Mon, 01 Jan 2024 00:00:00 GMT',
          headers: { 'x-custom': 'value' },
        },
        source: {
          id: 'source-id',
          name: 'Example Source',
          url: 'https://example.com/feed',
          collection: 'rss',
        },
      })
    ).toEqual({
      fact_check_id: 'fact-check-id',
      content_sha256: 'sha256abc',
      extracted_at: '1970-01-01T00:00:00.000Z',
      ingestor_run_id: 'ingestor-run-id',
      extractor_run_id: 'extractor-run-id',
      extractor_id: 'extractor-id',
      extractor_version: '1',
      fetched_at: '1970-01-01T00:00:00.000Z',
      fact_check: {
        sha256: 'abc123',
        guid: 'https://example.com/fact-check',
        title: 'A fact check title',
        author: 'Jane Doe',
        categories: ['politics', 'elections'],
        link: 'https://example.com/link',
        summary: 'Summary of findings',
        content: 'Full article body',
        language: 'en',
        enclosure_url: 'https://example.com/video.mp4',
        image_url: 'https://example.com/hero.png',
        published_at_raw: '2024-01-01',
        published_at_normalized: '2024-01-01T00:00:00.000Z',
        canonical_url: 'https://example.com/fact-check',
      },
      http: {
        status_code: 200,
        final_url: 'https://example.com/final',
        content_type: 'text/html',
        etag: '"etag123"',
        last_modified: 'Mon, 01 Jan 2024 00:00:00 GMT',
        headers: { 'x-custom': 'value' },
      },
      source: {
        id: 'source-id',
        name: 'Example Source',
        url: 'https://example.com/feed',
        collection: 'rss',
      },
    })
  })

  it('does not corrupt Markdown syntax in summary/content when encoding', () => {
    const result = Schema.encodeUnknownSync(FactCheckRowSchema)({
      factCheckId: 'fact-check-id',
      ingestorRunId: 'ingestor-run-id',
      extractorRunId: 'extractor-run-id',
      extractedAt: 0,
      fetchedAt: 0,
      extractor: { id: 'extractor-id', version: 1 },
      factCheck: {
        sha256: 'abc123',
        guid: null,
        title: null,
        author: null,
        categories: null,
        link: null,
        summary: 'A [link](https://example.com) and *bold* text',
        content: '## Heading\n\nA [link](https://example.com) and *bold* text',
        language: null,
        enclosureUrl: null,
        imageUrl: null,
        publishedAtRaw: null,
        publishedAtNormalized: null,
        canonicalUrl: null,
      },
      http: {
        contentSha256: 'sha256abc',
        status: 200,
        finalUrl: null,
        contentType: null,
        etag: null,
        lastModified: null,
        headers: null,
      },
      source: {
        id: 'source-id',
        name: 'Example Source',
        url: 'https://example.com/feed',
        collection: 'rss',
      },
    })
    expect(result.fact_check.summary).toBe(
      'A [link](https://example.com) and *bold* text'
    )
    expect(result.fact_check.content).toBe(
      '## Heading\n\nA [link](https://example.com) and *bold* text'
    )
  })
})
