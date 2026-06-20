import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { liteClient as algoliasearch } from 'algoliasearch/lite'
import type { InstantSearchServerState } from 'react-instantsearch'

import { Search } from '@/lib/search'
import { metadataBase } from '@/lib/seo'

// Keep the page dynamic so env vars are read at request time, not baked in
// during `next build`. The Algolia fetch is cached separately below.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = metadataBase

function makeBrowseFetcher(appId: string, searchKey: string, indexName: string) {
  return unstable_cache(
    async () => {
      const client = algoliasearch(appId, searchKey)
      return client.search([{ indexName, params: {} }])
    },
    ['algolia-browse', indexName],
    { revalidate: 21600 } // 6 hours — index is updated twice daily
  )
}

export default async function HomePage() {
  const appId = process.env.ALGOLIA_APP_ID ?? ''
  const searchKey = process.env.ALGOLIA_SEARCH_KEY ?? ''
  const indexName = process.env.ALGOLIA_INDEX_NAME ?? ''

  let serverState: InstantSearchServerState | undefined

  if (appId && searchKey && indexName) {
    try {
      const fetchBrowse = makeBrowseFetcher(appId, searchKey, indexName)
      const { results } = await fetchBrowse()
      serverState = {
        initialResults: {
          [indexName]: {
            state: { index: indexName },
            results,
          },
        },
      } as unknown as InstantSearchServerState
    } catch (error) {
      console.error(
        'Failed to prefetch initial search results for SSR, falling back to client-side rendering:',
        error
      )
    }
  }

  return (
    <Search
      appId={appId}
      searchKey={searchKey}
      indexName={indexName}
      serverState={serverState}
    />
  )
}
