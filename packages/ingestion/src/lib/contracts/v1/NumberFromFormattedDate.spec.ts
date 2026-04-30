import { it, expect } from '@effect/vitest'
import { Schema } from 'effect'

import { NumberFromFormattedDate } from './NumberFromFormattedDate'

describe('NumberFromFormattedDate', () => {
  it('can encode a number to a formatted date string', () => {
    expect(
      Schema.encodeSync(NumberFromFormattedDate('yyyy-MM-dd'))(1704067200000)
    ).toBe('2024-01-01')
  })
  it('can decode a formatted date string to a number', () => {
    expect(
      Schema.decodeSync(NumberFromFormattedDate('yyyy-MM-dd'))('2024-01-01')
    ).toBe(1704067200000)
  })
})
