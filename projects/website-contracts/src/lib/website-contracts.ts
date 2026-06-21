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

export type ContactSubmission = Schema.Schema.Type<
  typeof ContactSubmissionSchema
>

export const AccessRequestSchema = Schema.Struct({
  version: Schema.Literal(1),
  kind: Schema.Literal('access_request'),
  name: Schema.String,
  email: Schema.String,
  affiliation: Schema.String,
  project_description: Schema.String,
  submitted_at: Schema.String,
})

export type AccessRequest = Schema.Schema.Type<typeof AccessRequestSchema>

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

export const FormSubmissionSchema = Schema.Union(
  ContactSubmissionSchema,
  AccessRequestSchema,
  TipSubmissionSchema
)

export type FormSubmission = Schema.Schema.Type<typeof FormSubmissionSchema>
