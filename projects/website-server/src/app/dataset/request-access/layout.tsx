import { AccessLayout as AccessLayoutInternal } from '@/lib/access'
import { RecaptchaProvider, RecaptchaScript } from '@/lib/forms/recaptcha'

export default function AccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RecaptchaProvider siteKey={process.env.RECAPTCHA_SITE_KEY ?? ''}>
      <RecaptchaScript />
      <AccessLayoutInternal>{children}</AccessLayoutInternal>
    </RecaptchaProvider>
  )
}
