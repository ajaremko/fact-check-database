'use server'

import { Effect } from 'effect'
import { publish } from '@news-research/ingestion-messaging'

import * as ContactSubmission from '@/lib/contracts/ContactSubmission'
import { verifyRecaptcha } from '@/lib/forms/recaptcha-effect'
import { appLayer } from '@/lib/pubsub/app-layer'

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
  return Effect.runPromise(
    Effect.gen(function* () {
      yield* verifyRecaptcha(recaptchaToken, 'contact_form_submission')
      yield* publish(Buffer.from(JSON.stringify(ContactSubmission.make(data))))
      yield* Effect.logInfo('Contact form submitted').pipe(
        Effect.annotateLogs({ email: data.email, topic: data.topic })
      )
      return { success: true as const }
    }).pipe(
      Effect.tapErrorCause(Effect.logError),
      Effect.catchAll(() => Effect.succeed({ success: false as const })),
      Effect.provide(appLayer)
    )
  )
}
