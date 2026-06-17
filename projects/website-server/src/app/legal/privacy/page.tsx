import { Metadata } from 'next'

import { Privacy } from '@/lib/privacy'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Privacy Policy',
  description:
    'Privacy policy for the Fact Check Database — what information we collect, how we use it, and your rights.',
}

export default function PrivacyPage() {
  return <Privacy />
}
