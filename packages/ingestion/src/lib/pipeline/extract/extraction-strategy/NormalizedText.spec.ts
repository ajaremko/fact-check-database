import { Schema } from 'effect'

import { NormalizedTextSchema } from './NormalizedText'

describe('NormalizedTextSchema', () => {
  it('replaces right curly single-quotes with straight apostrophes', () => {
    const result = Schema.decodeSync(NormalizedTextSchema)('it\u2019s a test')
    expect(result).toBe("it's a test")
  })

  it('strips non-ASCII printable characters', () => {
    const result = Schema.decodeSync(NormalizedTextSchema)('caf\u00e9 au lait')
    expect(result).toBe('caf au lait')
  })

  it('collapses multiple whitespace into a single space', () => {
    const result = Schema.decodeSync(NormalizedTextSchema)('hello   world')
    expect(result).toBe('hello world')
  })

  it('trims leading and trailing whitespace', () => {
    const result = Schema.decodeSync(NormalizedTextSchema)('  hello world  ')
    expect(result).toBe('hello world')
  })

  it('collapses newlines and tabs into spaces', () => {
    const result = Schema.decodeSync(NormalizedTextSchema)(
      'line one\n  line two\t  line three'
    )
    expect(result).toBe('line one line two line three')
  })

  it('handles plain ASCII text unchanged (aside from normalisation)', () => {
    const result = Schema.decodeSync(NormalizedTextSchema)(
      'No changes needed here'
    )
    expect(result).toBe('No changes needed here')
  })

  it('encode applies the same normalisation as decode', () => {
    const result = Schema.encodeSync(NormalizedTextSchema)('it\u2019s a  test')
    expect(result).toBe("it's a test")
  })
})
