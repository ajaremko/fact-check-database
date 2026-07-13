import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'

import { AtomExtractor } from './AtomExtractor'

const ATOM_FEED = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Fact Checks</title>
  <entry xml:lang="en">
    <id>urn:uuid:1234</id>
    <title>Example claim checked</title>
    <link href="https://example.com/self" rel="self"/>
    <link href="https://example.com/article" rel="alternate"/>
    <author><name>Jane Doe</name></author>
    <category term="politics"/>
    <category term="elections" label="Elections"/>
    <published>2026-05-01T12:00:00Z</published>
    <updated>2026-05-02T08:00:00Z</updated>
    <summary>Short summary of the claim.</summary>
    <content>Full article body text.</content>
  </entry>
</feed>`

describe('AtomExtractor', () => {
  it('extracts a fully-populated entry from a real Atom feed shape', async () => {
    const [factCheck] = await Effect.runPromise(
      AtomExtractor.extractor({
        timestamp: 0,
        // record is unused by AtomExtractor's mapping logic
        record: null as never,
        data: new TextEncoder().encode(ATOM_FEED),
      })
    )

    expect(factCheck).toMatchObject({
      guid: 'urn:uuid:1234',
      link: 'https://example.com/article',
      canonicalUrl: 'https://example.com/article',
      title: 'Example claim checked',
      author: 'Jane Doe',
      categories: ['politics', 'elections'],
      summary: 'Short summary of the claim.',
      content: 'Full article body text.',
      language: 'en',
      publishedAtRaw: '2026-05-01T12:00:00Z',
      publishedAtNormalized: new Date('2026-05-01T12:00:00Z'),
    })
  })

  it('falls back to the sole link and to `updated` when `published` is absent', async () => {
    const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>https://example.com/article-2</id>
    <title>Another claim</title>
    <link href="https://example.com/article-2"/>
    <updated>2026-05-03T00:00:00Z</updated>
  </entry>
</feed>`

    const [factCheck] = await Effect.runPromise(
      AtomExtractor.extractor({
        timestamp: 0,
        record: null as never,
        data: new TextEncoder().encode(feed),
      })
    )

    expect(factCheck).toMatchObject({
      guid: 'https://example.com/article-2',
      link: 'https://example.com/article-2',
      canonicalUrl: 'https://example.com/article-2',
      publishedAtRaw: '2026-05-03T00:00:00Z',
      publishedAtNormalized: new Date('2026-05-03T00:00:00Z'),
      author: null,
      categories: null,
      content: null,
      language: null,
    })
  })
})
