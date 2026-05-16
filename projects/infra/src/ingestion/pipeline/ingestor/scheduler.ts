import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { ingestorSchedule, tag } from '../../config'
import { provider, schedulerServiceAgentEmail } from '../../project'

import { createInvokerServiceAccount } from '../createInvokerServiceAccount'
import { createJobScheduler } from '../createJobScheduler'

import { ingestorJob } from './job'

export const {
  serviceAccount: ingestorInvokerServiceAccount,
  serviceAccountInvoker: ingestorInvokerServiceAccountInvoker,
} = createInvokerServiceAccount({
  name: 'ingestor-push',
  serviceName: ingestorJob.name,
  displayName: 'Ingestion Ingestor Invoker',
  type: 'job',
})

const schedulerTokenCreator = new gcp.serviceaccount.IAMMember(
  `${tag}-ingestor-scheduler-token-creator`,
  {
    serviceAccountId: ingestorInvokerServiceAccount.name,
    role: 'roles/iam.serviceAccountTokenCreator',
    member: pulumi.interpolate`serviceAccount:${schedulerServiceAgentEmail}`,
  },
  { provider }
)

export const ingestorJobScheduler = createJobScheduler({
  name: 'ingestor-job-scheduler',
  description: 'Trigger Ingestor Cloud RunJob on configured schedule',
  schedule: ingestorSchedule,
  serviceName: ingestorJob.name,
  serviceAccountName: ingestorInvokerServiceAccount.name,
  serviceAccountEmail: ingestorInvokerServiceAccount.email,
  dependsOn: [schedulerTokenCreator],
})
