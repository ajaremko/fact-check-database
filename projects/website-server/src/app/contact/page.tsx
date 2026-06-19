import { Metadata } from 'next'

import { Contact } from '@/lib/contact'
import { RecaptchaProvider, RecaptchaScript } from '@/lib/forms'
import { metadataBase } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  ...metadataBase,
  title: 'FCDB | Contact',
  description:
    'Get in touch with the Fact Check Database team — dataset access requests, press inquiries, tips, or general feedback.',
}

export default function ContactPage() {
  return (
    <RecaptchaProvider siteKey={process.env.RECAPTCHA_SITE_KEY ?? ''}>
      <RecaptchaScript />
      <Contact />
    </RecaptchaProvider>
  )
}
