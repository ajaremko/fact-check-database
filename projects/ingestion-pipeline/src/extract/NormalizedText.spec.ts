import { Schema } from 'effect'

import { NormalizedTextSSchema } from './NormalizedText'

describe('NormalizedTextSSchema', () => {
  it('replaces non-ASCII printable characters with their ASCII equivalents', () => {
    const decode = Schema.decodeSync(NormalizedTextSSchema(32))
    expect(decode('it\u2019s a test')).toBe("it's a test")
    expect(decode('caf\u00e9 au lait')).toBe('cafe au lait')
  })

  it('collapses and trims white space and newlines', () => {
    const decode = Schema.decodeSync(NormalizedTextSSchema(32))
    expect(decode('hello   world')).toBe('hello world')
    expect(decode('  hello world  ')).toBe('hello world')
    expect(decode('line one\n  line two\t  line three')).toBe(
      'line one line two line three'
    )
  })

  it('truncates text to the specified length after normalization', () => {
    const decode = Schema.decodeSync(NormalizedTextSSchema(32))
    expect(
      decode(`
        line one\n  line two\t  line three
        line one\n  line two\t  line three
        line one\n  line two\t  line three`)
    ).toBe('line one line two line three lin')
    expect(decode('No changes needed here')).toBe('No changes needed here')
  })

  it('encode applies the same normalisation as decode', () => {
    const encode = Schema.encodeUnknownSync(NormalizedTextSSchema(32))
    expect(encode('it\u2019s a  test')).toBe("it's a test")
  })
})
