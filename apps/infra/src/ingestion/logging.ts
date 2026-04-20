import * as gcp from '@pulumi/gcp'

import { gcpProject, logRetention } from './config'
import { provider } from './provider'

export const loggingBucketConfig = new gcp.logging.ProjectBucketConfig(
  'logging-bucket-config',
  {
    project: gcpProject,
    location: 'global',
    retentionDays: logRetention,
    bucketId: '_Default',
  },
  {
    provider,
  }
)

export const loggingBucketConfigName = loggingBucketConfig.name
