import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'

import { RssExtractor } from './RssExtractor'

describe('RssExtractor', () => {
  it('extracts guid, author, categories, and content:encoded from a real RSS 2.0 item shape', async () => {
    const feed = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>Example Feed</title>
    <item>
      <title>Example claim checked</title>
      <link>https://example.com/article</link>
      <guid>https://example.com/article</guid>
      <dc:creator>Jane Doe</dc:creator>
      <category>politics</category>
      <category domain="https://example.com/tags">elections</category>
      <description>Short summary of the claim.</description>
      <content:encoded>Full article body text.</content:encoded>
      <pubDate>Fri, 01 May 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`

    const [factCheck] = await Effect.runPromise(
      RssExtractor.extractor({
        timestamp: 0,
        record: null as never,
        data: new TextEncoder().encode(feed),
      })
    )

    expect(factCheck).toMatchObject({
      guid: 'https://example.com/article',
      link: 'https://example.com/article',
      canonicalUrl: 'https://example.com/article',
      title: 'Example claim checked',
      author: 'Jane Doe',
      categories: ['politics', 'elections'],
      summary: 'Short summary of the claim.',
      content: 'Full article body text.',
      publishedAtRaw: 'Fri, 01 May 2026 12:00:00 GMT',
      publishedAtNormalized: new Date('Fri, 01 May 2026 12:00:00 GMT'),
    })
  })

  it('falls back to <link> for canonicalUrl when guid has isPermaLink="false"', async () => {
    const feed = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Another claim</title>
      <link>https://example.com/article-2</link>
      <guid isPermaLink="false">not-a-url-just-an-id</guid>
    </item>
  </channel>
</rss>`

    const [factCheck] = await Effect.runPromise(
      RssExtractor.extractor({
        timestamp: 0,
        record: null as never,
        data: new TextEncoder().encode(feed),
      })
    )

    expect(factCheck).toMatchObject({
      guid: 'not-a-url-just-an-id',
      link: 'https://example.com/article-2',
      canonicalUrl: 'https://example.com/article-2',
      author: null,
      categories: null,
      content: null,
    })
  })
})
