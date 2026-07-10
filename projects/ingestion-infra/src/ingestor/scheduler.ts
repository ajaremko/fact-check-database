import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { createInvokerServiceAccount, createJobScheduler } from '../shared'
import { ingestorSchedule, tag } from '../config'
import { provider, schedulerServiceAgentEmail } from '../project'

import { ingestorJob } from './job'

function getIngestorJobSchedulerName(schedule: string | undefined) {
  if (!schedule) {
    return {
      ingestorJobSchedulerName: pulumi.output('none'),
      ingestorInvokerServiceAccountEmail: pulumi.output('none'),
    }
  }

  const { serviceAccount: ingestorInvokerServiceAccount } =
    createInvokerServiceAccount({
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

  const ingestorJobScheduler = createJobScheduler({
    name: 'ingestor-job-scheduler',
    description: 'Trigger Ingestor Cloud RunJob on configured schedule',
    schedule,
    serviceName: ingestorJob.name,
    serviceAccountName: ingestorInvokerServiceAccount.name,
    serviceAccountEmail: ingestorInvokerServiceAccount.email,
    dependsOn: [schedulerTokenCreator],
  })

  const ingestorJobSchedulerName = ingestorJobScheduler.name
  const ingestorInvokerServiceAccountEmail = ingestorInvokerServiceAccount.email
  return { ingestorJobSchedulerName, ingestorInvokerServiceAccountEmail }
}

export const { ingestorJobSchedulerName, ingestorInvokerServiceAccountEmail } =
  getIngestorJobSchedulerName(ingestorSchedule)
