import * as gcp from '@pulumi/gcp'

import { gcpProject, logRetention, tag } from './config'
import { provider } from './project'

export const loggingBucketConfig = new gcp.logging.ProjectBucketConfig(
  `${tag}-logging-bucket-config`,
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
