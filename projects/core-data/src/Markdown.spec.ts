import { describe, it, expect } from 'vitest'

import { stripMarkdown } from './Markdown'

describe('stripMarkdown', () => {
  it('strips links down to their text', () => {
    expect(stripMarkdown('A [link](https://example.com) and *bold* text')).toBe(
      'A link and bold text'
    )
  })

  it('strips headings, emphasis, and list markers', () => {
    expect(
      stripMarkdown('## Key results\n\n**1.** Text\n\n-   one\n-   two')
    ).toBe('Key results\n\n1. Text\n\none\ntwo')
  })

  it('strips image syntax down to alt text', () => {
    expect(stripMarkdown('![alt](https://example.com/img.png)')).toBe('alt')
  })

  it('leaves plain text without Markdown syntax unchanged', () => {
    expect(stripMarkdown('plain text, no markdown at all')).toBe(
      'plain text, no markdown at all'
    )
  })
})
