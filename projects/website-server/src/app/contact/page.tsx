import { Metadata } from 'next'

import { Contact } from '@/lib/contact'
import { metadataBase } from '@/lib/seo'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Contact',
  description:
    'Get in touch with the Fact Check Database team for inquiries, support, or collaboration opportunities.',
}

export default function ContactPage() {
  return <Contact />
}
