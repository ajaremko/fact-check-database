import { describe, it, expect } from 'vitest'

import { factCheckId } from './factCheckId'

describe('factCheckId', () => {
  it('matches the id the curated MERGE computed in BigQuery', () => {
    // TO_HEX(SHA256(CONCAT(source.id, '|', canonical_url))) for a real staging row
    const result = factCheckId({
      sourceId: 'snopes',
      sourceUrl: 'https://www.snopes.com/feed/',
      canonicalUrl:
        'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
      link: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
      guid: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
      title: 'Ed Sheeran music on Spotify',
    })
    expect(result).toBe(
      '0262657013901cdc38caa437a387776872b890cda43b3e93568c5f4bdc4be520'
    )
  })

  it('does not change when the title or content changes', () => {
    const result = factCheckId({
      sourceId: 'snopes',
      sourceUrl: 'https://www.snopes.com/feed/',
      canonicalUrl:
        'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
      link: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
      guid: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
      title: 'An edited headline',
    })
    expect(result).toBe(
      '0262657013901cdc38caa437a387776872b890cda43b3e93568c5f4bdc4be520'
    )
    expect(result).toBe(
      factCheckId({
        sourceId: 'snopes',
        sourceUrl: 'https://www.snopes.com/feed/',
        canonicalUrl:
          'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
        link: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
        guid: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
        title: 'Ed Sheeran music on Spotify',
      })
    )
  })

  it('falls back from canonical URL to link', () => {
    const result = factCheckId({
      sourceId: 'snopes',
      sourceUrl: 'https://www.snopes.com/feed/',
      canonicalUrl: null,
      link: 'https://x/1',
      guid: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
      title: 'Ed Sheeran music on Spotify',
    })
    expect(result).toBe(
      '4f028aa369fdceb4fcca7cc7ba74382631de75478426917b3f6084700eae7f67'
    )
    expect(result).toBe(
      factCheckId({
        sourceId: 'snopes',
        sourceUrl: 'https://www.snopes.com/feed/',
        canonicalUrl: 'https://x/1',
        link: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
        guid: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
        title: 'Ed Sheeran music on Spotify',
      })
    )
  })

  it('falls back from link to guid', () => {
    const result = factCheckId({
      sourceId: 'snopes',
      sourceUrl: 'https://www.snopes.com/feed/',
      canonicalUrl: null,
      link: null,
      guid: 'urn:1',
      title: 'Ed Sheeran music on Spotify',
    })
    expect(result).toBe(
      '7311d2e3a680cb308d8d0943df0caf1213ac7d700f02b64d4e4ed2c7147b10bb'
    )
    expect(result).toBe(
      factCheckId({
        sourceId: 'snopes',
        sourceUrl: 'https://www.snopes.com/feed/',
        canonicalUrl: 'urn:1',
        link: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
        guid: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
        title: 'Ed Sheeran music on Spotify',
      })
    )
  })

  it('uses the feed URL and title only when an item has no URL or guid', () => {
    const result = factCheckId({
      sourceId: 'snopes',
      sourceUrl: 'https://www.snopes.com/feed/',
      canonicalUrl: null,
      link: null,
      guid: null,
      title: 'Ed Sheeran music on Spotify',
    })
    expect(result).toBe(
      '1ec8755c299d8d543e9f23c16e0e025b2cb3185f5e4435d36e35f43aabc0178c'
    )
    expect(result).not.toBe(
      factCheckId({
        sourceId: 'snopes',
        sourceUrl: 'https://www.snopes.com/feed/',
        canonicalUrl: null,
        link: null,
        guid: null,
        title: 'Another title',
      })
    )
  })

  it('differs across sources for the same article URL', () => {
    const result = factCheckId({
      sourceId: 'other',
      sourceUrl: 'https://www.snopes.com/feed/',
      canonicalUrl:
        'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
      link: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
      guid: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
      title: 'Ed Sheeran music on Spotify',
    })
    expect(result).toBe(
      '5bfd82203ec17a25ee2ed469db39b18ed02010bf053e8b4f1fd9a2341b3888ed'
    )
    expect(result).not.toBe(
      factCheckId({
        sourceId: 'snopes',
        sourceUrl: 'https://www.snopes.com/feed/',
        canonicalUrl:
          'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
        link: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
        guid: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
        title: 'Ed Sheeran music on Spotify',
      })
    )
  })
})
