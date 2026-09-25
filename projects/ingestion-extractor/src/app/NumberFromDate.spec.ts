import { describe, it, expect } from 'vitest'
import { Schema } from 'effect'

import { NumberFromDate } from './NumberFromDate'

describe('NumberFromDate', () => {
  it('decodes a Date into epoch milliseconds', () => {
    expect(Schema.decodeSync(NumberFromDate)(new Date(123_456_789))).toBe(
      123_456_789
    )
  })

  it('encodes epoch milliseconds into a Date', () => {
    expect(Schema.encodeSync(NumberFromDate)(123_456_789)).toEqual(
      new Date(123_456_789)
    )
  })

  it('round-trips through decode then encode', () => {
    const result = Schema.encodeSync(NumberFromDate)(
      Schema.decodeSync(NumberFromDate)(new Date(123_456_789))
    )
    expect(result).toEqual(new Date(123_456_789))
  })

  it('fails for NaN', () => {
    const result = Schema.encodeEither(NumberFromDate)(NaN)
    expect(result._tag).toBe('Left')
  })

  it('fails for Infinity', () => {
    const result = Schema.encodeEither(NumberFromDate)(Infinity)
    expect(result._tag).toBe('Left')
  })
})
