'use server'

import { verifyRecaptchaToken } from '@/lib/forms'
import * as ContactSubmission from '@/lib/contracts/ContactSubmission'
import { publishFormSubmission } from '@/lib/pubsub/publisher'

export type ContactFormData = {
  name: string
  email: string
  topic: string
  message: string
  recaptchaToken: string
}

export async function submitContactForm(
  formData: ContactFormData
): Promise<{ success: boolean }> {
  const { recaptchaToken, ...data } = formData
  const verification = await verifyRecaptchaToken(
    recaptchaToken,
    'contact_form_submission'
  )
  if (!verification.success) return { success: false }
  await publishFormSubmission(ContactSubmission.make(data))
  return { success: true }
}
