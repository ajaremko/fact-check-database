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

  it('decodes the rest of the feed when one item has an empty, attribute-only <guid>', async () => {
    // Real shape seen from Rappler: `<guid isPermaLink="false"></guid>` has no
    // text content at all, so fast-xml-parser omits '#text' entirely. Before
    // '#text' was made optional, this failed the whole document's decode —
    // zeroing out every item in the feed, not just this one.
    const feed = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>First claim</title>
      <link>https://example.com/first</link>
      <guid isPermaLink="false"></guid>
    </item>
    <item>
      <title>Second claim</title>
      <link>https://example.com/second</link>
      <guid>https://example.com/second</guid>
    </item>
  </channel>
</rss>`

    const factChecks = await Effect.runPromise(
      RssExtractor.extractor({
        timestamp: 0,
        record: null as never,
        data: new TextEncoder().encode(feed),
      })
    )

    expect(factChecks).toHaveLength(2)
    expect(factChecks[0]).toMatchObject({
      guid: null,
      link: 'https://example.com/first',
      canonicalUrl: 'https://example.com/first',
    })
    expect(factChecks[1]).toMatchObject({
      guid: 'https://example.com/second',
      canonicalUrl: 'https://example.com/second',
    })
  })

  it('extracts enclosure, media image, and channel-level language', async () => {
    const feed = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <language>el</language>
    <item>
      <title>Claim with evidence media</title>
      <link>https://example.com/article</link>
      <enclosure url="https://example.com/evidence.mp4" length="123" type="video/mp4" />
      <media:thumbnail url="https://example.com/thumb.jpg" />
      <media:content url="https://example.com/full.jpg" medium="image" />
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
      enclosureUrl: 'https://example.com/evidence.mp4',
      imageUrl: 'https://example.com/thumb.jpg',
      language: 'el',
    })
  })

  it('keeps numeric-looking text as strings instead of failing the feed', async () => {
    // Real shape seen from PressOne.PH: WordPress split the tag "P360,000" at
    // its comma, leaving a tag "000". Parsed as the number 0, it failed the
    // category schema and with it every item in the feed.
    const feed = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>2026</title>
      <link>https://example.com/article</link>
      <guid isPermaLink="false">0123</guid>
      <category>Duterte bail P360</category>
      <category>000</category>
      <category>000 total</category>
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
      title: '2026',
      guid: '0123',
      categories: ['Duterte bail P360', '000', '000 total'],
    })
  })
})
