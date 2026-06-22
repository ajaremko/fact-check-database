import * as gcp from '@pulumi/gcp'

import { tag, websiteLabels } from '../config'
import { provider } from '../project'
import { secretManagerService } from '../services'

export const resendApiKey = new gcp.secretmanager.Secret(
  `${tag}-resend-api-key`,
  {
    secretId: 'resend-api-key',
    labels: websiteLabels,
    replication: {
      auto: {},
    },
    deletionProtection: false,
  },
  { provider, dependsOn: secretManagerService }
)
