import * as gcp from '@pulumi/gcp'

import { gcpProject } from '../config'
import { provider } from '../project'
import { cloudRunService } from '../services'

import { gcpRegion, dockerTag, tag, logLevel } from '../config'
import { getImageUrl } from '../../ingestion/shared/getImageUrl'

import { emailerServiceAccount } from './service-account'

export const emailerService = new gcp.cloudrunv2.Service(
  `${tag}-emailer-service`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      serviceAccount: emailerServiceAccount.email,
      containers: [
        {
          image: getImageUrl('website-emailer', dockerTag),
          envs: [
            {
              name: 'LOGGING_LEVEL',
              value: logLevel,
            },
            {
              name: 'GOOGLE_CLOUD_PROJECT',
              value: gcpProject,
            },
            {
              name: 'OTEL_CLOUD_MONITORING_PREFIX',
              value: `workload.googleapis.com/${tag}/`,
            },
          ],
        },
      ],
    },
  },
  {
    dependsOn: [cloudRunService],
    provider,
  }
)
