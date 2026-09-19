'use server'

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

async function createAssessment(
  token: string,
  recaptchaAction: string
): Promise<AssessmentResult> {
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

  try {
    const [response] = await client.createAssessment(request)

    // Check if the token is valid.
    if (!response.tokenProperties || !response.tokenProperties.valid) {
      return { success: false, cause: new Error('Invalid token') }
    }

    // Check if the expected action was executed.
    // The `action` property is set by user client in the grecaptcha.enterprise.execute() method.
    if (response.tokenProperties.action !== recaptchaAction) {
      console.log(
        'The action attribute in your reCAPTCHA tag does not match the action you are expecting to score'
      )
      return { success: false, cause: new Error('Action mismatch') }
    }

    // For more information on interpreting the assessment, see:
    // https://cloud.google.com/recaptcha/docs/interpret-assessment
    if (!response.riskAnalysis || !response.riskAnalysis.score) {
      return {
        success: false,
        cause: new Error('No risk analysis available for this token.'),
      }
    }

    return {
      success: true,
      score: response.riskAnalysis.score,
      reasons: response.riskAnalysis.reasons ?? [],
    }
  } catch (error) {
    return { success: false, cause: error }
  }
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
  console.debug('[recaptcha] Verifying token for action:', recaptchaAction)
  const result = await createAssessment(token, recaptchaAction)
  if (!result.success) {
    console.debug('[recaptcha] Verification failed:', result.cause)
    return { success: false }
  }
  return { success: result.score >= SCORE_THRESHOLD, score: result.score }
}
