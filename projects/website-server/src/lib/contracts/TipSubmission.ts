import {
  TipSubmissionSchema,
  type TipSubmission,
} from '@news-research/website-contracts'

export { TipSubmissionSchema, type TipSubmission }

export const make = (data: {
  claim: string
  organization: string
  url: string
  context?: string
  contactEmail?: string
}): TipSubmission => ({
  version: 1,
  kind: 'tip_submission',
  submitted_at: new Date().toISOString(),
  claim: data.claim,
  organization: data.organization,
  url: data.url,
  context: data.context,
  contact_email: data.contactEmail,
})
