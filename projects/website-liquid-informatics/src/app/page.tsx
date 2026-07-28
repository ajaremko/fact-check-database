import type { Metadata } from 'next'

import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = metadataBase

export default async function HomePage() {
  return <div>HOME</div>
}
