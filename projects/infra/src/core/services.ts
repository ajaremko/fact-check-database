import * as gcp from '@pulumi/gcp'

import { tag } from './config'
import { provider } from './provider'

export const computeService = new gcp.projects.Service(
  `${tag}-compute-service`,
  {
    service: 'compute.googleapis.com',
  },
  { provider }
)

export const resourceManagerService = new gcp.projects.Service(
  `${tag}-resource-manager-service`,
  {
    service: 'cloudresourcemanager.googleapis.com',
  },
  { provider }
)

export const IAMService = new gcp.projects.Service(
  `${tag}-iam-service`,
  {
    service: 'iam.googleapis.com',
  },
  { provider }
)

export const IAMCredentialsService = new gcp.projects.Service(
  `${tag}-iam-credentials-service`,
  {
    service: 'iamcredentials.googleapis.com',
  },
  { provider }
)

export const securityTokenService = new gcp.projects.Service(
  `${tag}-security-token-service`,
  {
    service: 'sts.googleapis.com',
  },
  { provider }
)

export const pubsubService = new gcp.projects.Service(
  `${tag}-pubsub-service`,
  {
    service: 'pubsub.googleapis.com',
  },
  { provider }
)

export const kmsService = new gcp.projects.Service(
  `${tag}-kms-service`,
  {
    service: 'cloudkms.googleapis.com',
  },
  { provider }
)

export const storageService = new gcp.projects.Service(
  `${tag}-storage-service`,
  {
    service: 'storage.googleapis.com',
  },
  { provider }
)

export const artifactRegistryService = new gcp.projects.Service(
  `${tag}-artifact-registry-service`,
  {
    service: 'artifactregistry.googleapis.com',
  },
  { provider, dependsOn: [computeService, resourceManagerService] }
)
