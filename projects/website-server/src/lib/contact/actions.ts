'use server'

export type ContactFormData = {
  name: string
  email: string
  topic: string
  message: string
}

export async function submitContactForm(
  data: ContactFormData,
): Promise<{ success: boolean }> {
  console.log('[contact-form]', JSON.stringify(data))
  return { success: true }
}
