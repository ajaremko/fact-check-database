'use server'

import { verifyRecaptchaToken } from '@/lib/forms'

export type ContactFormData = {
  name: string
  email: string
  topic: string
  message: string
  recaptchaToken: string
}

export async function submitContactForm(
  data: ContactFormData,
): Promise<{ success: boolean }> {
  const verification = await verifyRecaptchaToken(
    data.recaptchaToken,
    'contact_form_submission',
  )
  if (!verification.success) return { success: false }
  console.log('[contact-form]', JSON.stringify(data))
  return { success: true }
}
