import { Schema } from 'effect'

import { NormalizedTextSchema } from './NormalizedText'

describe('NormalizedTextSchema', () => {
  const decode = Schema.decodeSync(NormalizedTextSchema)
  it('replaces non-ASCII printable characters with their ASCII equivalents', () => {
    expect(decode('it\u2019s a test')).toBe("it's a test")
    expect(decode('caf\u00e9 au lait')).toBe('cafe au lait')
  })

  it('collapses and trims white space and newlines', () => {
    expect(decode('hello   world')).toBe('hello world')
    expect(decode('  hello world  ')).toBe('hello world')
    expect(decode('line one\n  line two\t  line three')).toBe(
      'line one line two line three'
    )
  })

  it('handles plain ASCII text unchanged (aside from normalisation)', () => {
    expect(decode('No changes needed here')).toBe('No changes needed here')
  })

  it('encode applies the same normalisation as decode', () => {
    const encode = Schema.encodeSync(NormalizedTextSchema)
    expect(encode('it\u2019s a  test')).toBe("it's a test")
  })
})
