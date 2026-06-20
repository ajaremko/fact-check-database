import type { Metadata } from 'next'
import { liteClient as algoliasearch } from 'algoliasearch/lite'
import type { InstantSearchServerState } from 'react-instantsearch'

import { Search } from '@/lib/search'
import { metadataBase } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = metadataBase

export default async function HomePage() {
  const appId = process.env.ALGOLIA_APP_ID ?? ''
  const searchKey = process.env.ALGOLIA_SEARCH_KEY ?? ''
  const indexName = process.env.ALGOLIA_INDEX_NAME ?? ''

  let serverState: InstantSearchServerState | undefined

  if (appId && searchKey && indexName) {
    try {
      const client = algoliasearch(appId, searchKey)
      // Fetch the initial browse results server-side. This populates
      // InstantSearchSSRProvider so widgets render with real data during
      // hydration instead of an empty-hits flash.
      const { results } = await client.search([{ indexName, params: {} }])
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
