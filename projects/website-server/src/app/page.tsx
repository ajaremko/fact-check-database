import type { Metadata } from 'next'

import { Search } from '@/lib/search'
import { metadataBase } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = metadataBase

export default function HomePage() {
  return (
    <Search
      appId={process.env.ALGOLIA_APP_ID ?? ''}
      searchKey={process.env.ALGOLIA_SEARCH_KEY ?? ''}
      indexName={process.env.ALGOLIA_INDEX_NAME ?? ''}
    />
  )
}
