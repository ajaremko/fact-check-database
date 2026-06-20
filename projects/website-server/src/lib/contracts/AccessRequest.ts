import { Schema } from 'effect'

export const AccessRequestSchema = Schema.Struct({
  version: Schema.Literal(1),
  kind: Schema.Literal('access_request'),
  name: Schema.String,
  email: Schema.String,
  affiliation: Schema.String,
  project_description: Schema.String,
  data_volume: Schema.String,
  access_types: Schema.Array(Schema.String),
  submitted_at: Schema.String,
})

export type AccessRequest = Schema.Schema.Type<typeof AccessRequestSchema>

export const make = (data: {
  name: string
  email: string
  affiliation: string
  projectDescription: string
  dataVolume: string
  accessType: string[]
}): AccessRequest => ({
  version: 1,
  kind: 'access_request',
  submitted_at: new Date().toISOString(),
  name: data.name,
  email: data.email,
  affiliation: data.affiliation,
  project_description: data.projectDescription,
  data_volume: data.dataVolume,
  access_types: data.accessType,
})
