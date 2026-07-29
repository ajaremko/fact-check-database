import type { Metadata } from 'next'

import { Hero } from '@/lib/home'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = metadataBase

export default async function HomePage() {
  return <Hero />
}
