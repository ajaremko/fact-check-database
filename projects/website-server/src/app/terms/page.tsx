import { Metadata } from 'next'

import { Terms } from '@/lib/terms'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Terms of Service',
  description:
    'Terms of service for the Fact Check Database — permitted uses, dataset access conditions, attribution requirements, and limitations.',
}

export default function TermsPage() {
  return <Terms />
}
