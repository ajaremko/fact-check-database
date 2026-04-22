import { it, expect } from '@effect/vitest'
import { Schema } from 'effect'

import { ObservationIdSchema } from './ObservationId'
import { FetchFailure, FetchSuccess } from './FetchResult'

describe('ObservationIdSchema', () => {
  it('can encode a failure to an observation ID', () => {
    expect(
      Schema.encodeSync(ObservationIdSchema)(
        new FetchFailure({
          url: 'https://test-rss.com/rss',
          fetchedAt: 0,
          error: 'Network error',
          source: {
            name: 'Test Source',
            collection: 'rss',
          },
        })
      )
    ).toBe('v1|url=https://test-rss.com/rss|t=1970-01-01|error=Network error')
  })
  it('can encode a success to an observation ID', () => {
    expect(
      Schema.encodeSync(ObservationIdSchema)(
        new FetchSuccess({
          url: 'https://test-rss.com/rss',
          fetchedAt: 0,
          error: null,
          finalUrl: 'https://test-rss.com/rss',
          status: 200,
          headers: {},
          bytes: 1234,
          sha256: 'dummy-sha256',
          body: new Uint8Array(),
          source: {
            name: 'Test Source',
            collection: 'rss',
          },
        })
      )
    ).toBe('v1|url=https://test-rss.com/rss|sha256=dummy-sha256')
  })
})
