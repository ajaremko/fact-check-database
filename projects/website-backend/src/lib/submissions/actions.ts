'use server'

import { redirect } from 'next/navigation'
import { Effect } from 'effect'

import { TipSubmissionSchema } from '@news-research/website-contracts/form-submissions/v1'
import { publish } from '@news-research/core-io'

import { verifyRecaptcha } from '@/lib/forms/recaptcha-effect'
import { appLayer } from '@/lib/pubsub/app-layer'

export type SubmissionsFormData = {
  claim: string
  organization: string
  url: string
  context?: string
  email?: string
  recaptchaToken: string
}

export async function submitTip(data: SubmissionsFormData): Promise<void> {
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      yield* verifyRecaptcha(data.recaptchaToken, 'tip_submission')
      yield* publish(
        Buffer.from(
          JSON.stringify(
            TipSubmissionSchema.make({
              kind: 'tip_submission',
              version: 1,
              claim: data.claim,
              organization: data.organization,
              url: data.url,
              context: data.context,
              email: data.email,
              submitted_at: new Date().toISOString(),
            })
          )
        )
      )
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

  if (result.success) {
    redirect('/dataset/submissions/success')
  }
}
