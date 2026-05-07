import { Schema } from 'effect'

import { FactCheckRowSchema } from './FactCheck'

describe('FactCheckRowSchema', () => {
  it('encodes to bigquery row', () => {
    expect(
      Schema.encodeSync(FactCheckRowSchema)({
        id: 'lineage-id',
        observationId: 'obs-id',
        ingestionId: 'ing-id',
        extractionId: 'ext-id',
        extractedAt: 0,
        fetchedAt: 0,
        extractor: {
          id: 'extractor-id',
          version: 1,
        },
        factCheck: {
          sha256: 'abc123',
          title: 'A fact check title',
          claim: 'The claim being checked',
          verdict: 'False',
          link: 'https://example.com/link',
          normalizedVerdict: 'false',
          summary: 'Summary of findings',
          publishedAtRaw: '2024-01-01',
          publishedAtNormalized: new Date('2024-01-01'),
          canonicalUrl: 'https://example.com/fact-check',
          extractedFrom: 'https://example.com',
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
      content_lineage_id: 'lineage-id',
      content_sha256: 'sha256abc',
      extracted_at: '1970-01-01T00:00:00.000Z',
      ingestion_id: 'ing-id',
      extraction_id: 'ext-id',
      fetched_at: '1970-01-01T00:00:00.000Z',
      fact_check: {
        sha256: 'abc123',
        title: 'A fact check title',
        claim: 'The claim being checked',
        verdict: 'False',
        summary: 'Summary of findings',
        published_at: '2024-01-01',
        canonical_url: 'https://example.com/fact-check',
        extractor_id: 'extractor-id',
        extractor_version: 1,
        extracted_from: 'https://example.com',
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
})
