import { describe, it, expect } from 'vitest'
import { Schema } from 'effect'

import { NumberFromDate } from './NumberFromDate'

describe('NumberFromDate', () => {
  it('round-trips through encode then decode', () => {
    const original = new Date(123_456_789)
    const timestamp = Schema.decodeSync(NumberFromDate)(original)
    const restored = Schema.encodeSync(NumberFromDate)(timestamp)
    expect(restored).toEqual(original)
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
