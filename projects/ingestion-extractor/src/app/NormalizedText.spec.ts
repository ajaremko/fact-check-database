import { describe, it, expect } from 'vitest'
import { Schema } from 'effect'

import {
  NormalizedTextSSchema,
  NormalizedMarkdownSchema,
} from './NormalizedText'

describe('NormalizedTextSSchema', () => {
  it('preserves non-ASCII text and non-Latin scripts unchanged', () => {
    const decode = Schema.decodeSync(NormalizedTextSSchema(64))
    expect(decode('it’s a test')).toBe('it’s a test')
    expect(decode('café au lait')).toBe('café au lait')
    expect(decode('Говорил ли')).toBe('Говорил ли')
  })

  it('decodes HTML entity references', () => {
    const decode = Schema.decodeSync(NormalizedTextSSchema(64))
    expect(decode('Frank V&#246;hringer')).toBe('Frank Vöhringer')
    expect(decode('Ben &amp; Jerry')).toBe('Ben & Jerry')
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
    expect(encode('it’s a  test')).toBe('it’s a test')
  })
})

describe('NormalizedMarkdownSchema', () => {
  it('converts HTML to Markdown, preserving links and structure', () => {
    const decode = Schema.decodeSync(NormalizedMarkdownSchema)
    expect(decode('<p>Hello <a href="https://example.com">world</a></p>')).toBe(
      'Hello [world](https://example.com)'
    )
    expect(
      decode('<h2>Key results</h2><ul><li>one</li><li>two</li></ul>')
    ).toBe('## Key results\n\n-   one\n-   two')
  })

  it('preserves non-Latin scripts unchanged (no transliteration)', () => {
    const decode = Schema.decodeSync(NormalizedMarkdownSchema)
    expect(decode('<p>Говорил ли Нильс Бор?</p>')).toBe('Говорил ли Нильс Бор?')
  })

  it('collapses spurious blank-line runs without touching nested-list indentation', () => {
    const decode = Schema.decodeSync(NormalizedMarkdownSchema)
    const result = decode('<p>one</p><br><br><br><p>two</p>')
    expect(result).toBe('one\n\ntwo')

    const nested = decode(
      '<ul><li>one<ul><li>nested</li></ul></li><li>two</li></ul>'
    )
    expect(nested).toBe('-   one\n    -   nested\n-   two')
  })

  it('does not truncate long content', () => {
    const decode = Schema.decodeSync(NormalizedMarkdownSchema)
    const longParagraph = `<p>${'word '.repeat(2000).trim()}</p>`
    const result = decode(longParagraph)
    expect(result.length).toBeGreaterThan(4096)
  })
})
