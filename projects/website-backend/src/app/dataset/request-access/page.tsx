import { Metadata } from 'next'

import { AccessForm } from '@/lib/access'
import { metadataBase } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Request Access',
  description:
    'Request access to the Fact Check Database dataset for academic research, journalism, or data science projects.',
}

export default function AccessPage() {
  return <AccessForm />
}
