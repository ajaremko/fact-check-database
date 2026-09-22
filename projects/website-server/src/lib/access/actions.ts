'use server'

import { Clock, Effect, Schema } from 'effect'
import { redirect } from 'next/navigation'

import * as Node from '@fact-check-database/core-data/Node'
import * as Yaml from '@fact-check-database/core-data/Yaml'
import { AccessRequestSchema } from '@fact-check-database/website-contracts/form-submissions/v1'
import { writeFile } from '@fact-check-database/core-io'

import { verifyRecaptcha } from '@/lib/forms/recaptcha-effect'
import { appLayer } from '@/lib/effect/app-layer'

export type AccessFormData = {
  name: string
  email: string
  affiliation: string
  projectDescription: string
  recaptchaToken: string
}

const encodeAccessRequest = AccessRequestSchema.pipe(
  Yaml.parseYaml(),
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

      const id = yield* Node.generateUUID()

      const data = yield* encodeAccessRequest({
        kind: 'access_request',
        version: 1,
        submitted_at: new Date(timestamp),
        name: formData.name,
        email: formData.email,
        affiliation: formData.affiliation,
        project_description: formData.projectDescription,
      })

      yield* writeFile({
        path: `submissions/access-request-${id}.yml`,
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
    redirect('/dataset/request-access/success')
  }
}
