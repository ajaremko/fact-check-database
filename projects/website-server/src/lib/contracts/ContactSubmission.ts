import {
  ContactSubmissionSchema,
  type ContactSubmission,
} from '@news-research/website-contracts'

export { ContactSubmissionSchema, type ContactSubmission }

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
