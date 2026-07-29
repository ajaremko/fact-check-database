import { Metadata } from 'next'

import { ContactForm } from '@/lib/contact'
import { metadataBase } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'Liquid Informatics | Contact',
  description: 'Get in touch with Liquid Informatics.',
}

export default function ContactPage() {
  return <ContactForm />
}
