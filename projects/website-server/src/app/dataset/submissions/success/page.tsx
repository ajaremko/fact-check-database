import { Metadata } from 'next'

import { FormSuccessPage } from '@/lib/forms/FormSuccessPage'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Tip Submitted',
  description: 'Your tip submission has been received.',
}

export default function SubmissionsSuccessPage() {
  return (
    <FormSuccessPage
      sectionLabel="Submit a Tip"
      title="Tip received"
      message="Thank you for the submission. We review all tips and will follow up if your source leads to a new integration."
      returnHref="/dataset/submissions"
      returnLabel="Submit another tip"
    />
  )
}
