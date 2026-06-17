import { Metadata } from 'next'

import { Corrections } from '@/lib/corrections'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Corrections',
  description:
    'Our corrections policy and public log of changes to the Fact Check Database documentation and metadata.',
}

export default function CorrectionsPage() {
  return <Corrections />
}
