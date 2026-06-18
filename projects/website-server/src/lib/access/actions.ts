'use server'

export type AccessFormData = {
  name: string
  email: string
  affiliation: string
  projectDescription: string
  dataVolume: string
  accessType: string[]
}

export async function submitAccessRequest(
  data: AccessFormData,
): Promise<{ success: boolean }> {
  console.log('[access-request]', JSON.stringify(data))
  return { success: true }
}
