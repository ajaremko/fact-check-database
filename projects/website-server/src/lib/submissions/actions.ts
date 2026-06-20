'use server'

import { verifyRecaptchaToken } from '@/lib/forms'
import * as TipSubmission from '@/lib/contracts/TipSubmission'
import { publishFormSubmission } from '@/lib/pubsub/publisher'

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
  await publishFormSubmission(TipSubmission.make(data))
  return { success: true }
}
