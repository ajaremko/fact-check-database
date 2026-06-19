import { Metadata } from 'next'

import { Submissions } from '@/lib/submissions'
import { RecaptchaProvider, RecaptchaScript } from '@/lib/forms'
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
    <RecaptchaProvider siteKey={process.env.RECAPTCHA_SITE_KEY ?? ''}>
      <RecaptchaScript />
      <Submissions />
    </RecaptchaProvider>
  )
}
