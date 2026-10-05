import { describe, it, expect } from 'vitest'

import { stripQueryParams, stripQueryParamsInText } from './stripQueryParams'

describe('stripQueryParams', () => {
  it('removes every parameter that starts with an entry ending in an underscore', () => {
    const result = stripQueryParams(
      'https://annielab.org/2026/09/30/claim-check/?utm_source=rss&utm_medium=rss&utm_campaign=claim-check',
      ['utm_']
    )
    expect(result).toBe('https://annielab.org/2026/09/30/claim-check/')
  })

  it('removes a parameter named exactly by an entry and keeps the others in order', () => {
    const result = stripQueryParams(
      'https://example.org/article?id=7&fbclid=IwAR0x9Qz&page=2',
      ['fbclid']
    )
    expect(result).toBe('https://example.org/article?id=7&page=2')
  })

  it('treats an entry without a trailing underscore as a whole name, not a prefix', () => {
    expect(
      stripQueryParams('https://example.org/?gclid_source=7', ['gclid'])
    ).toBe('https://example.org/?gclid_source=7')
  })

  it('keeps the parameters a site needs to find the page', () => {
    const result = stripQueryParams(
      'https://example.org/?p=4720&post_type=fact-check&utm_source=rss',
      ['utm_', 'fbclid', 'gclid', 'mc_cid', 'mc_eid']
    )
    expect(result).toBe('https://example.org/?p=4720&post_type=fact-check')
  })

  it('matches parameter names case-insensitively', () => {
    expect(
      stripQueryParams('https://example.org/a?UTM_Source=Newsletter&id=7', [
        'utm_',
      ])
    ).toBe('https://example.org/a?id=7')
  })

  it('keeps the fragment', () => {
    expect(
      stripQueryParams('https://example.org/a?utm_source=rss#comments', [
        'utm_',
      ])
    ).toBe('https://example.org/a#comments')
  })

  it('reads an entity-encoded ampersand as a separator and keeps the one before a kept parameter', () => {
    expect(
      stripQueryParams(
        'https://example.org/?p=4720&#038;utm_source=rss&#038;utm_medium=rss',
        ['utm_']
      )
    ).toBe('https://example.org/?p=4720')
    expect(
      stripQueryParams(
        'https://example.org/?utm_source=rss&amp;p=4720&amp;preview=true',
        ['utm_']
      )
    ).toBe('https://example.org/?p=4720&amp;preview=true')
  })

  it('returns a URL with nothing to remove unchanged', () => {
    expect(
      stripQueryParams('https://i0.wp.com/example.org/a.jpg?resize=75,75', [
        'utm_',
      ])
    ).toBe('https://i0.wp.com/example.org/a.jpg?resize=75,75')
    expect(stripQueryParams('https://example.org/feed/', ['utm_'])).toBe(
      'https://example.org/feed/'
    )
  })
})

describe('stripQueryParamsInText', () => {
  it('strips the URLs in a feed item and leaves the rest of the text as written', () => {
    const result = stripQueryParamsInText(
      `<item>
        <title>Vérification : a viral claim</title>
        <link>https://example.org/claim-check/?utm_source=rss&amp;utm_medium=rss</link>
        <guid isPermaLink="false">https://example.org/?p=4720</guid>
        <description><![CDATA[<a href="https://example.org/claim-check/?utm_source=rss&#038;utm_campaign=feed">Read more</a>]]></description>
      </item>`,
      ['utm_']
    )
    expect(result).toStrictEqual({
      text: `<item>
        <title>Vérification : a viral claim</title>
        <link>https://example.org/claim-check/</link>
        <guid isPermaLink="false">https://example.org/?p=4720</guid>
        <description><![CDATA[<a href="https://example.org/claim-check/">Read more</a>]]></description>
      </item>`,
      urlsChanged: 2,
    })
  })

  it('ends a URL at the close of a CDATA section', () => {
    const result = stripQueryParamsInText(
      '<link><![CDATA[https://example.org/a?utm_source=rss]]></link>',
      ['utm_']
    )
    expect(result).toStrictEqual({
      text: '<link><![CDATA[https://example.org/a]]></link>',
      urlsChanged: 1,
    })
  })

  it('ends a URL at the escaped quote that closes an attribute in escaped HTML', () => {
    const result = stripQueryParamsInText(
      '&lt;a href=&quot;https://example.org/a?id=7&amp;amp;utm_source=rss&quot;&gt;Read more&lt;/a&gt;',
      ['utm_']
    )
    expect(result).toStrictEqual({
      text: '&lt;a href=&quot;https://example.org/a?id=7&quot;&gt;Read more&lt;/a&gt;',
      urlsChanged: 1,
    })
  })

  it('leaves the punctuation after a URL in a sentence', () => {
    const result = stripQueryParamsInText(
      'Source: https://example.org/a?utm_source=rss. Archived (https://example.org/b?fbclid=IwAR0x9Qz).',
      ['utm_', 'fbclid']
    )
    expect(result).toStrictEqual({
      text: 'Source: https://example.org/a. Archived (https://example.org/b).',
      urlsChanged: 2,
    })
  })

  it('reports no change for text whose URLs carry no listed parameter', () => {
    const result = stripQueryParamsInText(
      '<link>https://example.org/?p=4720</link><guid>urn:uuid:8f17a3f0</guid>',
      ['utm_']
    )
    expect(result).toStrictEqual({
      text: '<link>https://example.org/?p=4720</link><guid>urn:uuid:8f17a3f0</guid>',
      urlsChanged: 0,
    })
  })

  it('reads a URL through non-ASCII characters in a body decoded as Latin-1', () => {
    // 'à' is the bytes C3 A0 in UTF-8. Decoded as Latin-1, A0 is a no-break
    // space, which must not end the URL.
    const result = stripQueryParamsInText(
      Buffer.from(
        'https://example.org/à-propos?utm_source=rss&id=7 — suite',
        'utf-8'
      ).toString('latin1'),
      ['utm_']
    )
    expect(Buffer.from(result.text, 'latin1').toString('utf-8')).toBe(
      'https://example.org/à-propos?id=7 — suite'
    )
  })
})
