'use server'

import { Clock, Effect, Schema } from 'effect'
import { redirect } from 'next/navigation'

import * as Node from '@news-research/core-data/Node'
import { AccessRequestSchema } from '@news-research/website-contracts/form-submissions/v1'
import { publish } from '@news-research/core-io'

import { verifyRecaptcha } from '@/lib/forms/recaptcha-effect'
import { appLayer } from '@/lib/pubsub/app-layer'

export type AccessFormData = {
  name: string
  email: string
  affiliation: string
  projectDescription: string
  recaptchaToken: string
}

const encodeAccessRequest = AccessRequestSchema.pipe(
  Node.parseJson(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

export async function submitAccessRequest(
  formData: AccessFormData
): Promise<void> {
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      yield* Effect.logInfo('Access request submitted')
      const timestamp = yield* Clock.currentTimeMillis
      yield* verifyRecaptcha(formData.recaptchaToken, 'access_request')

      const data = yield* encodeAccessRequest({
        kind: 'access_request',
        version: 1,
        submitted_at: new Date(timestamp),
        name: formData.name,
        email: formData.email,
        affiliation: formData.affiliation,
        project_description: formData.projectDescription,
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
    redirect('/dataset/request-access/success')
  }
}
