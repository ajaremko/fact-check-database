import { Metadata } from 'next'

import { Dataset } from '@/lib/dataset'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Dataset',
  description:
    'Access our comprehensive dataset of verified fact-checks, available for download for researchers.',
}

export default function DatasetPage() {
  return <Dataset />
}
