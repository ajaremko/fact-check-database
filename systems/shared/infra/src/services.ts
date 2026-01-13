import * as gcp from '@pulumi/gcp'

export const IAMService = new gcp.projects.Service('iam-service', {
  service: 'iam.googleapis.com',
})

export const IAMCredentialsService = new gcp.projects.Service(
  'iam-credentials-service',
  {
    service: 'iamcredentials.googleapis.com',
  }
)

export const securityTokenService = new gcp.projects.Service(
  'security-token-service',
  {
    service: 'sts.googleapis.com',
  }
)

export const pubsubService = new gcp.projects.Service('pubsub-service', {
  service: 'pubsub.googleapis.com',
})

export const kmsService = new gcp.projects.Service('kms-service', {
  service: 'cloudkms.googleapis.com',
})
