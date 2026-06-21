import {
  AccessRequestSchema,
  type AccessRequest,
} from '@news-research/website-contracts'

export { AccessRequestSchema, type AccessRequest }

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
})
