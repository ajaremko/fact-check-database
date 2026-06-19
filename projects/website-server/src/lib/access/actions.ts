'use server'

import { verifyRecaptchaToken } from '@/lib/forms'

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
  console.log('[access-request]', JSON.stringify(data))
  return { success: true }
}
