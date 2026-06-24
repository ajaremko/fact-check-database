'use server'

import { redirect } from 'next/navigation'
import { Effect } from 'effect'

import { AccessRequestSchema } from '@news-research/website-contracts'
import { publish } from '@news-research/core-messaging'

import { verifyRecaptcha } from '@/lib/forms/recaptcha-effect'
import { appLayer } from '@/lib/pubsub/app-layer'

export type AccessFormData = {
  name: string
  email: string
  affiliation: string
  projectDescription: string
  recaptchaToken: string
}

export async function submitAccessRequest(data: AccessFormData): Promise<void> {
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      yield* verifyRecaptcha(data.recaptchaToken, 'access_request')
      yield* publish(
        Buffer.from(
          JSON.stringify(
            AccessRequestSchema.make({
              kind: 'access_request',
              version: 1,
              name: data.name,
              email: data.email,
              affiliation: data.affiliation,
              project_description: data.projectDescription,
              submitted_at: new Date().toISOString(),
            })
          )
        )
      )
      yield* Effect.logInfo('Access request submitted').pipe(
        Effect.annotateLogs({
          email: data.email,
          affiliation: data.affiliation,
        })
      )
      return { success: true as const }
    }).pipe(
      Effect.tapErrorCause(Effect.logError),
      Effect.catchAll(() => Effect.succeed({ success: false as const })),
      Effect.provide(appLayer)
    )
  )

  if (result.success) {
    redirect('/dataset/request-access/success')
  }
}
