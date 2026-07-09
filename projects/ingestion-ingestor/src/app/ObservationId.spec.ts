import { it, expect } from '@effect/vitest'
import { describe } from 'vitest'
import { Schema } from 'effect'

import { ObservationIdSchema } from './ObservationId'

describe('ObservationIdSchema', () => {
  it('can encode a failure to an observation ID', () => {
    expect(
      Schema.encodeUnknownSync(ObservationIdSchema)({
        source: {
          id: 'baddata',
          collection: 'rss',
          name: 'baddata.com',
          url: 'https://baddata.com/rss.xml',
        },
        result: {
          _tag: 'FetchFailure',
          error: 'Transport error (GET https://baddata.com/rss.xml)',
        },
        fetchedAt: 0,
      })
    ).toBe(
      'v1|url=https://baddata.com/rss.xml|t=1970-01-01|error=Transport error (GET https://baddata.com/rss.xml)'
    )
  })
  it('can encode a success to an observation ID', () => {
    expect(
      Schema.encodeUnknownSync(ObservationIdSchema)({
        source: {
          id: 'politifact',
          name: 'politifact.com',
          url: 'https://www.politifact.com/rss/all/',
          collection: 'rss',
        },
        result: {
          _tag: 'FetchSuccess',
          finalUrl: 'https://www.politifact.com/rss/all/',
          status: 200,
          headers: {
            date: 'Wed, 29 Apr 2026 20:35:08 GMT',
            'content-type': 'application/rss+xml; charset=utf-8',
            'content-length': '10648',
            connection: 'keep-alive',
            'last-modified': 'Wed, 29 Apr 2026 16:20:04 GMT',
            'cache-control': 'public, max-age=3600',
            ETag: '33a64df551425fcc55e4d42a148795d9f25f89d4',
          },
          contentType: 'application/rss+xml; charset=utf-8',
          etag: '33a64df551425fcc55e4d42a148795d9f25f89d4',
          lastModified: 'Wed, 29 Apr 2026 16:20:04 GMT',
          bytes: 10648,
          sha256:
            '311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6',
          body: new Uint8Array(),
          error: null,
        },
        fetchedAt: 0,
      })
    ).toBe(
      'v1|url=https://www.politifact.com/rss/all/|sha256=311512f7305c79593e1732ed514850722c5c80929c371e499c4cc3cb517492c6'
    )
  })
})
