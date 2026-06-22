import { Metadata } from 'next'

import { FormSuccessPage } from '@/lib/forms/FormSuccessPage'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Message Sent',
  description: 'Your message has been received.',
}

export default function ContactSuccessPage() {
  return (
    <FormSuccessPage
      sectionLabel="Contact"
      title="Message received"
      message="Thank you for reaching out. We'll follow up at the email address you provided."
      returnHref="/contact"
      returnLabel="Send another message"
    />
  )
}
