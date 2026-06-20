'use server'

import { verifyRecaptchaToken } from '@/lib/forms'
import * as AccessRequest from '@/lib/contracts/AccessRequest'
import { publishFormSubmission } from '@/lib/pubsub/publisher'

export type AccessFormData = {
  name: string
  email: string
  affiliation: string
  projectDescription: string
  dataVolume: string
  accessType: string[]
  recaptchaToken: string
}

export async function submitAccessRequest(
  data: AccessFormData,
): Promise<{ success: boolean }> {
  const verification = await verifyRecaptchaToken(
    data.recaptchaToken,
    'access_request',
  )
  if (!verification.success) return { success: false }
  await publishFormSubmission(AccessRequest.make(data))
  return { success: true }
}
