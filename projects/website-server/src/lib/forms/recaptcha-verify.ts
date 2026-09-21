'use server'

import { Effect, Logger, LogLevel } from 'effect'
import { RecaptchaEnterpriseServiceClient } from '@google-cloud/recaptcha-enterprise'
import type { google } from '@google-cloud/recaptcha-enterprise/build/protos/protos'

const projectId = process.env.RECAPTCHA_PROJECT_ID ?? ''
const siteKey = process.env.RECAPTCHA_SITE_KEY ?? ''

type Env = {
  client: RecaptchaEnterpriseServiceClient
  projectPath: string
}

let env: Env | null = null

function accessEnv(): Env {
  if (env === null) {
    const client = new RecaptchaEnterpriseServiceClient()
    const projectPath = client.projectPath(projectId)
    env = { client, projectPath }
  }
  return env
}

type AssessmentResult =
  | {
      success: true
      score: number
      reasons: google.cloud.recaptchaenterprise.v1.RiskAnalysis.ClassificationReason[]
    }
  | {
      success: false
      cause: unknown
    }

function createAssessment(
  token: string,
  recaptchaAction: string
): Effect.Effect<AssessmentResult> {
  const { client, projectPath } = accessEnv()

  // Build the assessment request.
  const request = {
    assessment: {
      event: {
        token: token,
        siteKey,
      },
    },
    parent: projectPath,
  }

  return Effect.gen(function* () {
    const [response] = yield* Effect.tryPromise({
      try: () => client.createAssessment(request),
      catch: (cause) => cause,
    })

    // Check if the token is valid.
    if (!response.tokenProperties || !response.tokenProperties.valid) {
      return { success: false, cause: new Error('Invalid token') } as const
    }

    // Check if the expected action was executed.
    // The `action` property is set by user client in the grecaptcha.enterprise.execute() method.
    if (response.tokenProperties.action !== recaptchaAction) {
      yield* Effect.logDebug(
        'The action attribute in your reCAPTCHA tag does not match the action you are expecting to score'
      )
      return { success: false, cause: new Error('Action mismatch') } as const
    }

    // For more information on interpreting the assessment, see:
    // https://cloud.google.com/recaptcha/docs/interpret-assessment
    if (!response.riskAnalysis || !response.riskAnalysis.score) {
      return {
        success: false,
        cause: new Error('No risk analysis available for this token.'),
      } as const
    }

    return {
      success: true,
      score: response.riskAnalysis.score,
      reasons: response.riskAnalysis.reasons ?? [],
    } as const
  }).pipe(
    Effect.catchAll((cause) =>
      Effect.succeed({ success: false, cause } as const)
    )
  )
}

const SCORE_THRESHOLD = 0.5

type VerificationResult = {
  success: boolean
  score?: number
}

export async function verifyRecaptchaToken(
  token: string,
  recaptchaAction: string
): Promise<VerificationResult> {
  // Runs in its own isolated Effect runtime (this module isn't wired into the
  // app's Effect dependency graph), so the minimum log level is set
  // explicitly here rather than deferring to the app's LOGGING_LEVEL config.
  return Effect.runPromise(
    Effect.gen(function* () {
      yield* Effect.logDebug('Verifying reCAPTCHA token').pipe(
        Effect.annotateLogs({ action: recaptchaAction })
      )
      const result = yield* createAssessment(token, recaptchaAction)
      if (!result.success) {
        yield* Effect.logDebug('reCAPTCHA verification failed').pipe(
          Effect.annotateLogs({ cause: result.cause })
        )
        return { success: false }
      }
      return { success: result.score >= SCORE_THRESHOLD, score: result.score }
    }).pipe(Logger.withMinimumLogLevel(LogLevel.Debug))
  )
}
