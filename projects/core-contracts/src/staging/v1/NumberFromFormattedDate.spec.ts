import { it, expect } from '@effect/vitest'
import { Schema } from 'effect'
import { describe } from 'vitest'

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
  it('fails to decode a string that does not match the format', () => {
    const decode = Schema.decodeSync(NumberFromFormattedDate('yyyy-MM-dd'))
    for (const input of ['not-a-date', '', '2024', '2024-13-45']) {
      expect(() => decode(input)).toThrow()
    }
  })
  it('fails to encode a number that is not a valid date', () => {
    const encode = Schema.encodeSync(NumberFromFormattedDate('yyyy-MM-dd'))
    expect(() => encode(NaN)).toThrow()
  })
})
