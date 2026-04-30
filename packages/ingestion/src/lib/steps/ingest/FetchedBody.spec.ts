import { expect } from '@effect/vitest'
import { Schema } from 'effect'

import { FetchedBody, FetchedBodyPathSchema } from './FetchedBody'

describe('FetchedBodyPathSchema', () => {
  it('encodes to a raw archive path', () => {
    const fetchedBody = new FetchedBody({
      observationId: 'obs-1',
      ingestionId: 'run-1',
      fetchedAt: 0,
      sourceName: 'politifact.com',
      body: new Uint8Array(),
      contentType: 'application/rss+xml; charset=utf-8',
    })

    expect(Schema.encodeSync(FetchedBodyPathSchema)(fetchedBody)).toBe(
      'v1/raw/source=politifact.com/date=1970-01-01/ingestion_id=run-1/obs-1.bin'
    )
  })
})
