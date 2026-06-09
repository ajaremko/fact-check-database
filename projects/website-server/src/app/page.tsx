import { PageClient } from '@/components/PageClient'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <PageClient
      appId={process.env.ALGOLIA_APP_ID ?? ''}
      searchKey={process.env.ALGOLIA_SEARCH_KEY ?? ''}
      indexName={process.env.ALGOLIA_INDEX_NAME ?? ''}
    />
  )
}
