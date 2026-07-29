import { Metadata } from 'next'

import { ContactFormSuccess } from '@/lib/contact'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'Liquid Informatics | Message Sent',
  description: 'Your message has been received.',
}

export default function ContactSuccessPage() {
  return <ContactFormSuccess />
}
