import * as gcp from '@pulumi/gcp'

import { gcpProject } from '../config'
import { provider } from '../project'
import { cloudRunService } from '../services'

import {
  adminEmail,
  dockerTag,
  gcpRegion,
  logLevel,
  resendApiKeySecretVersion,
  resendConfirmationTemplateId,
  tag,
} from '../config'
import { getImageUrl } from '../../ingestion/shared/getImageUrl'

import { emailerServiceAccount, iamMembers } from './service-account'
import { resendApiKey } from './resend'

const resendApiKeySecretMount = resendApiKeySecretVersion
  ? [
      {
        name: 'RESEND_API_KEY',
        valueSource: {
          secretKeyRef: {
            secret: resendApiKey.secretId,
            version: resendApiKeySecretVersion,
          },
        },
      },
    ]
  : []

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
            ...resendApiKeySecretMount,
            {
              name: 'RESEND_CONFIRMATION_TEMPLATE_ID',
              value: resendConfirmationTemplateId,
            },
            {
              name: 'ADMIN_EMAIL',
              value: adminEmail,
            },
          ],
        },
      ],
    },
  },
  {
    dependsOn: [cloudRunService, ...iamMembers],
    provider,
  }
)
