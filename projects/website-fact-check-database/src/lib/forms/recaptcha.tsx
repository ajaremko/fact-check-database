'use client'

import Script from 'next/script'
import { createContext, useContext, useState } from 'react'

export const RecaptchaContext = createContext<{
  siteKey: string
  ready: boolean
  handleScriptLoaded: () => void
} | null>(null)

export function RecaptchaProvider({
  siteKey,
  children,
}: {
  siteKey: string
  children: React.ReactNode
}) {
  const [ready, setReady] = useState(false)

  const handleScriptLoaded = () => {
    setReady(true)
  }

  return (
    <RecaptchaContext.Provider value={{ siteKey, ready, handleScriptLoaded }}>
      {children}
    </RecaptchaContext.Provider>
  )
}

export function useRecaptcha() {
  const context = useContext(RecaptchaContext)
  if (!context) {
    throw new Error('useRecaptcha must be used within a RecaptchaProvider')
  }
  return context
}

export function RecaptchaScript() {
  const context = useRecaptcha()
  return (
    <Script
      src={`https://www.google.com/recaptcha/enterprise.js?render=${context.siteKey}`}
      strategy="afterInteractive"
      onLoad={context.handleScriptLoaded}
      onError={(err) => console.error('reCAPTCHA script failed to load', err)}
    />
  )
}

export function RecaptchaWidget() {
  const context = useRecaptcha()
  if (!context.ready) return null
  return <input type="hidden" name="recaptchaToken" id="recaptcha-token" />
}

declare global {
  const grecaptcha: {
    enterprise: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, options: { action: string }) => Promise<string>
    }
  }
}

export function useGetRecaptchaToken(action: string) {
  const context = useRecaptcha()
  return async () => {
    if (!context.ready) {
      return Promise.reject(new Error('reCAPTCHA not ready'))
    }
    return new Promise<string>((resolve, reject) => {
      grecaptcha.enterprise.ready(async () => {
        try {
          resolve(
            await grecaptcha.enterprise.execute(context.siteKey, {
              action,
            })
          )
        } catch (e) {
          reject(e)
        }
      })
    })
  }
}
