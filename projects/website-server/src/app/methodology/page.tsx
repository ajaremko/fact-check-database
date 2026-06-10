import { Metadata } from 'next'

import { Methodology } from '@/lib/methodology'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Methodology',
  description:
    'How the Fact Check Database collects, validates, and structures fact-check records — from RSS feed to queryable dataset.',
}

export default function MethodologyPage() {
  return <Methodology />
}
