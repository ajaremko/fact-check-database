'use client'

import Script from 'next/script'

interface Props {
  siteKey: string
}

export function RecaptchaWrapper({ siteKey }: Props) {
  return (
    <Script
      src={`https://www.google.com/recaptcha/enterprise.js?render=${siteKey}`}
      strategy="afterInteractive"
    />
  )
}
