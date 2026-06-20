import { Schema } from 'effect'

export const TipSubmissionSchema = Schema.Struct({
  version: Schema.Literal(1),
  kind: Schema.Literal('tip_submission'),
  claim: Schema.String,
  organization: Schema.String,
  url: Schema.String,
  context: Schema.optional(Schema.String),
  contact_email: Schema.optional(Schema.String),
  submitted_at: Schema.String,
})

export type TipSubmission = Schema.Schema.Type<typeof TipSubmissionSchema>

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
