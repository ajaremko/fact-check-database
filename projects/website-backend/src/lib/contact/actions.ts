'use server'

import { Clock, Effect, Schema } from 'effect'
import { redirect } from 'next/navigation'

import * as Node from '@news-research/core-data/Node'
import { ContactSubmissionSchema } from '@news-research/website-contracts/form-submissions/v1'
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

const encodeContactSubmission = ContactSubmissionSchema.pipe(
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

export async function submitContactForm(
  formData: ContactFormData
): Promise<void> {
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      yield* Effect.logInfo('Contact form submitted')
      const timestamp = yield* Clock.currentTimeMillis
      yield* verifyRecaptcha(formData.recaptchaToken, 'contact_form_submission')

      const data = yield* encodeContactSubmission({
        kind: 'contact_submission',
        version: 1,
        submitted_at: new Date(timestamp),
        name: formData.name,
        email: formData.email,
        topic: formData.topic,
        message: formData.message,
      })

      yield* publish(data)

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
