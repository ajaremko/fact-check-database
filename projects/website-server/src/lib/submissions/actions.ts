'use server'

import { Effect } from 'effect'
import { publish } from '@news-research/ingestion-messaging'

import * as TipSubmission from '@/lib/contracts/TipSubmission'
import { verifyRecaptcha } from '@/lib/forms/recaptcha-effect'
import { appLayer } from '@/lib/pubsub/app-layer'

export type SubmissionsFormData = {
  claim: string
  organization: string
  url: string
  context?: string
  contactEmail?: string
  recaptchaToken: string
}

export async function submitTip(
  data: SubmissionsFormData,
): Promise<{ success: boolean }> {
  return Effect.runPromise(
    Effect.gen(function* () {
      yield* verifyRecaptcha(data.recaptchaToken, 'tip_submission')
      yield* publish(Buffer.from(JSON.stringify(TipSubmission.make(data))))
      yield* Effect.logInfo('Tip submitted').pipe(
        Effect.annotateLogs({ organization: data.organization, url: data.url })
      )
      return { success: true as const }
    }).pipe(
      Effect.tapErrorCause(Effect.logError),
      Effect.catchAll(() => Effect.succeed({ success: false as const })),
      Effect.provide(appLayer)
    )
  )
}
