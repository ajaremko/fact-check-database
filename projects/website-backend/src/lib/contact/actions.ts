'use server'

import { redirect } from 'next/navigation'
import { Effect } from 'effect'

import { ContactSubmissionSchema } from '@news-research/website-contracts'
import { publish } from '@news-research/core-io'

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
): Promise<void> {
  const { recaptchaToken, ...data } = formData
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      yield* verifyRecaptcha(recaptchaToken, 'contact_form_submission')
      yield* publish(
        Buffer.from(
          JSON.stringify(
            ContactSubmissionSchema.make({
              kind: 'contact_submission',
              version: 1,
              name: data.name,
              email: data.email,
              topic: data.topic,
              message: data.message,
              submitted_at: new Date().toISOString(),
            })
          )
        )
      )
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

  if (result.success) {
    redirect('/contact/success')
  }
}
