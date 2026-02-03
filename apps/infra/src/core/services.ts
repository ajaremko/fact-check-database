import * as gcp from '@pulumi/gcp'

import { provider } from './provider'

export const computeService = new gcp.projects.Service(
  'compute-service',
  {
    service: 'compute.googleapis.com',
  },
  { provider }
)

export const IAMService = new gcp.projects.Service(
  'iam-service',
  {
    service: 'iam.googleapis.com',
  },
  { provider }
)

export const IAMCredentialsService = new gcp.projects.Service(
  'iam-credentials-service',
  {
    service: 'iamcredentials.googleapis.com',
  },
  { provider }
)

export const securityTokenService = new gcp.projects.Service(
  'security-token-service',
  {
    service: 'sts.googleapis.com',
  },
  { provider }
)

export const pubsubService = new gcp.projects.Service(
  'pubsub-service',
  {
    service: 'pubsub.googleapis.com',
  },
  { provider }
)

export const kmsService = new gcp.projects.Service(
  'kms-service',
  {
    service: 'cloudkms.googleapis.com',
  },
  { provider }
)

export const storageService = new gcp.projects.Service(
  'storage-service',
  {
    service: 'storage.googleapis.com',
  },
  { provider }
)
