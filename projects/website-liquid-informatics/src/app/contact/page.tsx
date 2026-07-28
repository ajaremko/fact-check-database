import { Metadata } from 'next'

import { ContactForm } from '@/lib/contact'
import { metadataBase } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Contact',
  description:
    'Get in touch with the Fact Check Database team — dataset access requests, press inquiries, tips, or general feedback.',
}

export default function ContactPage() {
  return <ContactForm />
}
