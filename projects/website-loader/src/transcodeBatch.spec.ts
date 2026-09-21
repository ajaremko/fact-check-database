import { describe, it, expect } from '@effect/vitest'
import { Effect } from 'effect'

import { transcodeBatch } from './transcodeBatch'

function encodeBatch(rows: readonly unknown[]): Uint8Array {
  return new TextEncoder().encode(
    rows.map((row) => JSON.stringify(row)).join('\n')
  )
}

const fullRow = {
  content_lineage_id: 'lineage-1',
  content_sha256: 'sha-content-1',
  extracted_at: '2026-01-01T00:00:00.000Z',
  fetched_at: '2026-01-01T00:00:00.000Z',
  ingestion_id: 'ingestion-1',
  extraction_id: 'extraction-1',
  source: {
    id: 'politifact',
    name: 'politifact.com',
    url: 'https://www.politifact.com/rss/all/',
    collection: 'rss',
  },
  extractor_id: 'extractor-1',
  extractor_version: '1',
  fact_check: {
    sha256: 'sha-factcheck-1',
    title: 'A false claim about something',
    author: 'Jane Doe',
    categories: ['Politics', 'Health'],
    summary: 'The claim is false.',
    link: 'https://example.com/fact-check-1',
    image_url: 'https://example.com/image.png',
    published_at_raw: '2026-01-01T00:00:00.000Z',
    published_at_normalized: '2026-01-01T00:00:00.000Z',
    canonical_url: 'https://example.com/canonical',
    language: 'en',
  },
  http: {
    final_url: 'https://example.com/final',
    status_code: 200,
    etag: 'W/"abc123"',
    content_type: 'application/rss+xml',
    last_modified: '2026-01-01T00:00:00.000Z',
    headers: {
      'content-length': '10648',
      'content-type': 'application/rss+xml',
    },
  },
}

describe('transcodeBatch', () => {
  it.effect('maps every field of a fully-populated row', () =>
    Effect.gen(function* () {
      const [result] = yield* transcodeBatch(encodeBatch([fullRow]))

      expect(result).toStrictEqual({
        objectID: 'lineage-1',
        content_type: 'application/rss+xml',
        content_length: '10648',
        final_url: 'https://example.com/final',
        extracted_at: '2026-01-01T00:00:00.000Z',
        source_collection: 'rss',
        source_id: 'politifact',
        source_url: 'https://www.politifact.com/rss/all/',
        source_name: 'politifact.com',
        image_url: 'https://example.com/image.png',
        canonical_url: 'https://example.com/canonical',
        language: 'en',
        link: 'https://example.com/fact-check-1',
        published_at_normalized: '2026-01-01T00:00:00.000Z',
        published_at_raw: '2026-01-01T00:00:00.000Z',
        summary: 'The claim is false.',
        title: 'A false claim about something',
        author: 'Jane Doe',
        categories: ['Politics', 'Health'],
      })
    })
  )

  it.effect('transcodes every row in a multi-line batch', () =>
    Effect.gen(function* () {
      const secondRow = {
        ...fullRow,
        content_lineage_id: 'lineage-2',
        source: { ...fullRow.source, id: 'snopes', name: 'snopes.com' },
      }

      const results = yield* transcodeBatch(encodeBatch([fullRow, secondRow]))

      expect(results.map((r) => r.objectID)).toStrictEqual([
        'lineage-1',
        'lineage-2',
      ])
      expect(results[1].source_id).toBe('snopes')
    })
  )

  it.effect(
    'omits content_length when http.headers is absent, rather than falling back to etag',
    () =>
      Effect.gen(function* () {
        const row = {
          ...fullRow,
          http: {
            final_url: fullRow.http.final_url,
            etag: 'W/"abc123"',
            content_type: fullRow.http.content_type,
          },
        }

        const [result] = yield* transcodeBatch(encodeBatch([row]))

        expect(result).not.toHaveProperty('content_length')
      })
  )

  it.effect(
    'omits optional fields entirely when absent, rather than carrying them as undefined',
    () =>
      Effect.gen(function* () {
        const minimalRow = {
          content_lineage_id: 'lineage-minimal',
          content_sha256: 'sha-content-minimal',
          extracted_at: '2026-01-01T00:00:00.000Z',
          fetched_at: '2026-01-01T00:00:00.000Z',
          ingestion_id: 'ingestion-1',
          extraction_id: 'extraction-1',
          source: fullRow.source,
          extractor_id: 'extractor-1',
          extractor_version: '1',
          fact_check: {
            sha256: 'sha-factcheck-minimal',
          },
          http: {},
        }

        const [result] = yield* transcodeBatch(encodeBatch([minimalRow]))

        expect(result).toStrictEqual({
          objectID: 'lineage-minimal',
          extracted_at: '2026-01-01T00:00:00.000Z',
          source_collection: 'rss',
          source_id: 'politifact',
          source_url: 'https://www.politifact.com/rss/all/',
          source_name: 'politifact.com',
        })
      })
  )
})
