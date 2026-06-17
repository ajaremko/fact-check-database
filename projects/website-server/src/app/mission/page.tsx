import { Metadata } from 'next'

import { Mission } from '@/lib/mission'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Mission',
  description:
    'The Fact Check Database is built on principles of openness, auditability, governance, and neutrality to support rigorous information integrity research.',
}

export default function MissionPage() {
  return <Mission />
}
