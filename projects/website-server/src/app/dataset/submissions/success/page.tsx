import { Metadata } from 'next'

import { SubmissionsFormSuccess } from '@/lib/submissions'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Tip Submitted',
  description: 'Your tip submission has been received.',
}

export default function SubmissionsSuccessPage() {
  return <SubmissionsFormSuccess />
}
