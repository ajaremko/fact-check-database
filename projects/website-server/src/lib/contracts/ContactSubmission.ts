import { Schema } from 'effect'

export const ContactSubmissionSchema = Schema.Struct({
  version: Schema.Literal(1),
  kind: Schema.Literal('contact_submission'),
  name: Schema.String,
  email: Schema.String,
  topic: Schema.String,
  message: Schema.String,
  submitted_at: Schema.String,
})

export type ContactSubmission = Schema.Schema.Type<typeof ContactSubmissionSchema>

export const make = (data: {
  name: string
  email: string
  topic: string
  message: string
}): ContactSubmission => ({
  version: 1,
  kind: 'contact_submission',
  submitted_at: new Date().toISOString(),
  ...data,
})
