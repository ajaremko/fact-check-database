import { Search } from '@/lib/search'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <Search
      appId={process.env.ALGOLIA_APP_ID ?? ''}
      searchKey={process.env.ALGOLIA_SEARCH_KEY ?? ''}
      indexName={process.env.ALGOLIA_INDEX_NAME ?? ''}
    />
  )
}
