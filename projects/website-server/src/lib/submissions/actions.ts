'use server'

import { verifyRecaptchaToken } from '@/lib/forms'

export type SubmissionsFormData = {
  claim: string
  organization: string
  url: string
  context?: string
  contactEmail?: string
  recaptchaToken: string
}

export async function submitTip(
  data: SubmissionsFormData,
): Promise<{ success: boolean }> {
  const verification = await verifyRecaptchaToken(
    data.recaptchaToken,
    'tip_submission',
  )
  if (!verification.success) return { success: false }
  console.log('[tip-submission]', JSON.stringify(data))
  return { success: true }
}
