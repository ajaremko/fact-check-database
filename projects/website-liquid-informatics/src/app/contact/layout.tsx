import { ContactLayout as ContactLayoutInternal } from '@/lib/contact'
import { RecaptchaProvider, RecaptchaScript } from '@/lib/forms/recaptcha'

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RecaptchaProvider siteKey={process.env.RECAPTCHA_SITE_KEY ?? ''}>
      <RecaptchaScript />
      <ContactLayoutInternal>{children}</ContactLayoutInternal>
    </RecaptchaProvider>
  )
}
