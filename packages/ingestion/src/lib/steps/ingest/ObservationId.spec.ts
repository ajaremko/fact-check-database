import { it, expect } from '@effect/vitest'
import { Schema } from 'effect'

import { ObservationIdSchema } from './ObservationId'

describe('ObservationIdSchema', () => {
  it('can encode a failure to an observation ID', () => {
    expect(
      Schema.encodeSync(ObservationIdSchema)({
        version: 1,
        url: 'https://test-rss.com/rss',
        fetchedAt: new Date('2024-01-01').getTime(),
        error: 'Network error',
      })
    ).toBe('v1|url=https://test-rss.com/rss|t=2024-01-01|error=Network error')
  })
  it('can encode a success to an observation ID', () => {
    expect(
      Schema.encodeSync(ObservationIdSchema)({
        version: 1,
        url: 'https://test-rss.com/rss',
        sha256: 'dummy-sha256',
      })
    ).toBe('v1|url=https://test-rss.com/rss|sha256=dummy-sha256')
  })
})
