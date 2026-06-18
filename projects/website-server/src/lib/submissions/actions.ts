'use server'

export type SubmissionsFormData = {
  claim: string
  organization: string
  url: string
  context?: string
  contactEmail?: string
}

export async function submitTip(
  data: SubmissionsFormData,
): Promise<{ success: boolean }> {
  console.log('[tip-submission]', JSON.stringify(data))
  return { success: true }
}
