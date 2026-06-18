const SCORE_THRESHOLD = 0.5

interface AssessmentResponse {
  tokenProperties: {
    valid: boolean
    action: string
  }
  riskAnalysis: {
    score: number
  }
}

const apiKey = process.env.RECAPTCHA_API_KEY
const projectId = process.env.RECAPTCHA_PROJECT_ID
const siteKey = process.env.RECAPTCHA_SITE_KEY

console.log(
  '[recaptcha] config',
  JSON.stringify({ apiKey, projectId, siteKey })
)

export async function verifyRecaptchaToken(
  token: string,
  action: string
): Promise<{ success: boolean; score: number }> {
  if (!apiKey || !projectId || !siteKey) {
    console.error('[recaptcha] missing required environment variables')
    return { success: false, score: 0 }
  }

  let response: Response
  try {
    response = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: { token, siteKey, expectedAction: action },
        }),
      }
    )
  } catch (e) {
    console.error('[recaptcha] assessment request failed', e)
    return { success: false, score: 0 }
  }

  if (!response.ok) {
    const bytes = await response.arrayBuffer()
    const text = new TextDecoder().decode(bytes)
    console.error('[recaptcha] assessment returned HTTP', response.status, text)
    return { success: false, score: 0 }
  }

  const assessment = (await response.json()) as AssessmentResponse
  const { valid, action: returnedAction } = assessment.tokenProperties
  const score = assessment.riskAnalysis.score

  if (!valid || returnedAction !== action) {
    console.error('[recaptcha] invalid token or action mismatch', {
      valid,
      returnedAction,
      action,
    })
    return { success: false, score }
  }

  return { success: score >= SCORE_THRESHOLD, score }
}
