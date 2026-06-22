import { Metadata } from 'next'

import { AccessFormSuccess } from '@/lib/access'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Request Submitted',
  description: 'Your dataset access request has been received.',
}

export default function AccessSuccessPage() {
  return <AccessFormSuccess />
}
