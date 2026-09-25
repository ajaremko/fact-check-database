import { Schema, pipe } from 'effect'
import { describe, it, expect } from 'vitest'

import { htmlToMarkdown, decodeHtmlEntities } from './Html'

describe('htmlToMarkdown', () => {
  it('converts paragraphs and links to Markdown', () => {
    const decode = pipe(Schema.String, htmlToMarkdown(), Schema.decodeSync)
    const result = decode(
      '<p>Hello <a href="https://example.com">world</a></p>'
    )
    expect(result).toBe('Hello [world](https://example.com)')
  })

  it('preserves list structure', () => {
    const decode = pipe(Schema.String, htmlToMarkdown(), Schema.decodeSync)
    const result = decode('<ul><li>one</li><li>two</li></ul>')
    expect(result).toBe('-   one\n-   two')
  })

  it('preserves headings and emphasis', () => {
    const decode = pipe(Schema.String, htmlToMarkdown(), Schema.decodeSync)
    const result = decode('<h2>Key results</h2><p><strong>1.</strong> Text</p>')
    expect(result).toBe('## Key results\n\n**1.** Text')
  })

  it('decodes HTML entities as part of conversion', () => {
    const decode = pipe(Schema.String, htmlToMarkdown(), Schema.decodeSync)
    const result = decode('<p>Frank V&#246;hringer &amp; friends&#8230;</p>')
    expect(result).toBe('Frank Vöhringer & friends…')
  })

  it('passes through plain, tag-free text', () => {
    const decode = pipe(Schema.String, htmlToMarkdown(), Schema.decodeSync)
    const result = decode('just plain text, no tags at all')
    expect(result).toBe('just plain text, no tags at all')
  })

  it('does not throw on malformed/unclosed HTML', () => {
    const decode = pipe(Schema.String, htmlToMarkdown(), Schema.decodeSync)
    const result = () => decode('<p>unclosed <span>tag')
    expect(result).not.toThrow()
  })

  it('preserves non-Latin scripts unchanged', () => {
    const decode = pipe(Schema.String, htmlToMarkdown(), Schema.decodeSync)
    const result = decode('<p>Говорил ли Нильс Бор?</p>')
    expect(result).toBe('Говорил ли Нильс Бор?')
  })

  it('encode passes already-Markdown text through unchanged (does not re-convert it)', () => {
    const encode = pipe(Schema.String, htmlToMarkdown(), Schema.encodeSync)
    expect(encode('A [link](https://example.com) and *bold* text')).toBe(
      'A [link](https://example.com) and *bold* text'
    )
  })
})

describe('decodeHtmlEntities', () => {
  it('decodes numeric and named entities without interpreting tags', () => {
    const decode = pipe(Schema.String, decodeHtmlEntities(), Schema.decodeSync)
    expect(decode('Frank V&#246;hringer')).toBe('Frank Vöhringer')
    expect(decode("Ben &amp; Jerry's <b>bold</b>")).toBe(
      "Ben & Jerry's <b>bold</b>"
    )
  })

  it('leaves plain text without entities unchanged', () => {
    const decode = pipe(Schema.String, decodeHtmlEntities(), Schema.decodeSync)
    expect(decode('no entities here')).toBe('no entities here')
  })
})
