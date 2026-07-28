import { Metadata } from 'next'

import { SubmissionsForm, SubmissionsNote } from '@/lib/submissions'
import { metadataBase } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Submissions',
  description:
    'Submit a tip about a fact-checking organization or published fact-check that should be included in the Fact Check Database.',
}

export default function SubmissionsPage() {
  return (
    <>
      <SubmissionsForm />
      <SubmissionsNote />
    </>
  )
}
