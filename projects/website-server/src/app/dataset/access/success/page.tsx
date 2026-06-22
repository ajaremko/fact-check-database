import { Metadata } from 'next'

import { FormSuccessPage } from '@/lib/forms/FormSuccessPage'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Request Submitted',
  description: 'Your dataset access request has been received.',
}

export default function AccessSuccessPage() {
  return (
    <FormSuccessPage
      sectionLabel="Get Access"
      title="Request received"
      message="Thank you for your interest. Access requests are typically reviewed within 5 business days. We'll follow up at the email address you provided to discuss your project and confirm your access level."
      returnHref="/dataset/access"
      returnLabel="Submit another request"
    />
  )
}
