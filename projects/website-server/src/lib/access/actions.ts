'use server'

import { Effect } from 'effect'
import { publish } from '@news-research/ingestion-messaging'

import * as AccessRequest from '@/lib/contracts/AccessRequest'
import { verifyRecaptcha } from '@/lib/forms/recaptcha-effect'
import { appLayer } from '@/lib/pubsub/app-layer'

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
  return Effect.runPromise(
    Effect.gen(function* () {
      yield* verifyRecaptcha(data.recaptchaToken, 'access_request')
      yield* publish(Buffer.from(JSON.stringify(AccessRequest.make(data))))
      yield* Effect.logInfo('Access request submitted').pipe(
        Effect.annotateLogs({ email: data.email, affiliation: data.affiliation })
      )
      return { success: true as const }
    }).pipe(
      Effect.tapErrorCause(Effect.logError),
      Effect.catchAll(() => Effect.succeed({ success: false as const })),
      Effect.provide(appLayer)
    )
  )
}
