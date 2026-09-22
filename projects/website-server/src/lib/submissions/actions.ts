'use server'

import { Clock, Effect, Schema } from 'effect'
import { redirect } from 'next/navigation'

import * as Node from '@fact-check-database/core-data/Node'
import * as Yaml from '@fact-check-database/core-data/Yaml'
import { TipSubmissionSchema } from '@fact-check-database/website-contracts/form-submissions/v1'
import { writeFile } from '@fact-check-database/core-io'

import { verifyRecaptcha } from '@/lib/forms/recaptcha-effect'
import { appLayer } from '@/lib/effect/app-layer'

export type SubmissionsFormData = {
  claim: string
  organization: string
  url: string
  context?: string
  email?: string
  recaptchaToken: string
}

const encodeContactSubmission = TipSubmissionSchema.pipe(
  Yaml.parseYaml(),
  Node.parseBuffer({ encoding: 'utf-8' }),
  Schema.encode
)

export async function submitTip(formData: SubmissionsFormData): Promise<void> {
  const result = await Effect.runPromise(
    Effect.gen(function* () {
      yield* Effect.logInfo('Tip form submitted')
      const timestamp = yield* Clock.currentTimeMillis
      yield* verifyRecaptcha(formData.recaptchaToken, 'tip_submission')

      const id = yield* Node.generateUUID()

      const data = yield* encodeContactSubmission({
        kind: 'tip_submission',
        version: 1,
        submitted_at: new Date(timestamp),
        claim: formData.claim,
        organization: formData.organization,
        url: formData.url,
        context: formData.context,
        email: formData.email,
      })

      yield* writeFile({
        path: `submissions/tip-${id}.yml`,
        contentType: 'application/yaml',
        data,
      })

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
