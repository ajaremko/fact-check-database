import { describe, it, expect } from 'vitest'

import { factCheckId } from './factCheckId'

const base = {
  sourceId: 'snopes',
  sourceUrl: 'https://www.snopes.com/feed/',
  canonicalUrl: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
  link: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
  guid: 'https://www.snopes.com/fact-check/ed-sheeran-music-spotify/',
  title: 'Ed Sheeran music on Spotify',
}

describe('factCheckId', () => {
  it('matches the id the curated MERGE computed in BigQuery', () => {
    // TO_HEX(SHA256(CONCAT(source.id, '|', canonical_url))) for a real staging row
    expect(factCheckId(base)).toBe(
      '0262657013901cdc38caa437a387776872b890cda43b3e93568c5f4bdc4be520'
    )
  })

  it('does not change when the title or content changes', () => {
    expect(factCheckId({ ...base, title: 'An edited headline' })).toBe(
      factCheckId(base)
    )
  })

  it('falls back from canonical URL to link to guid', () => {
    const noCanonical = { ...base, canonicalUrl: null, link: 'https://x/1' }
    expect(factCheckId(noCanonical)).toBe(
      factCheckId({ ...base, canonicalUrl: 'https://x/1' })
    )
    const guidOnly = { ...noCanonical, link: null, guid: 'urn:1' }
    expect(factCheckId(guidOnly)).toBe(
      factCheckId({ ...base, canonicalUrl: 'urn:1' })
    )
  })

  it('uses the feed URL and title only when an item has no URL or guid', () => {
    const bare = { ...base, canonicalUrl: null, link: null, guid: null }
    expect(factCheckId(bare)).not.toBe(
      factCheckId({ ...bare, title: 'Another title' })
    )
  })

  it('differs across sources for the same article URL', () => {
    expect(factCheckId({ ...base, sourceId: 'other' })).not.toBe(
      factCheckId(base)
    )
  })
})
