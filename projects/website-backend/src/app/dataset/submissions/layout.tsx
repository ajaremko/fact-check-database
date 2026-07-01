import { SubmissionsLayout as SubmissionsLayoutInternal } from '@/lib/submissions'
import { RecaptchaProvider, RecaptchaScript } from '@/lib/forms/recaptcha'

export default function SubmissionsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RecaptchaProvider siteKey={process.env.RECAPTCHA_SITE_KEY ?? ''}>
      <RecaptchaScript />
      <SubmissionsLayoutInternal>{children}</SubmissionsLayoutInternal>
    </RecaptchaProvider>
  )
}
