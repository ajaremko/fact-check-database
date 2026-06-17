import { Metadata } from 'next'

import { Team } from '@/lib/team'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Team',
  description:
    'Meet the team behind the Fact Check Database — researchers and engineers building open, auditable infrastructure for information integrity research.',
}

export default function TeamPage() {
  return <Team />
}
