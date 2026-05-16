import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { extractorSchedule, tag } from '../../config'
import { provider, schedulerServiceAgentEmail } from '../../project'

import { createInvokerServiceAccount } from '../createInvokerServiceAccount'
import { createJobScheduler } from '../createJobScheduler'

import { extractorJob } from './job'

export const {
  serviceAccount: extractorInvokerServiceAccount,
  serviceAccountInvoker: extractorInvokerServiceAccountInvoker,
} = createInvokerServiceAccount({
  name: 'extractor-push',
  serviceName: extractorJob.name,
  displayName: 'Ingestion Extractor Invoker',
  type: 'job',
})

const schedulerTokenCreator = new gcp.serviceaccount.IAMMember(
  `${tag}-extractor-scheduler-token-creator`,
  {
    serviceAccountId: extractorInvokerServiceAccount.name,
    role: 'roles/iam.serviceAccountTokenCreator',
    member: pulumi.interpolate`serviceAccount:${schedulerServiceAgentEmail}`,
  },
  { provider }
)

export const extractorJobScheduler = createJobScheduler({
  name: 'extractor-job-scheduler',
  description: 'Trigger Extractor Cloud RunJob on configured schedule',
  schedule: extractorSchedule,
  serviceName: extractorJob.name,
  serviceAccountName: extractorInvokerServiceAccount.name,
  serviceAccountEmail: extractorInvokerServiceAccount.email,
  dependsOn: [schedulerTokenCreator],
})
