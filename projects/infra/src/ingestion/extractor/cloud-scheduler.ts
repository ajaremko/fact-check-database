import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpRegion, gcpProject, extractorSchedule, tag } from '../config'
import { cloudSchedulerService } from '../services'
import { provider } from '../provider'

import { extractorJob } from './cloud-run'

const invokerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-extractor-scheduler-sa`,
  {
    accountId: `${tag}-extractor-sched-sa`,
    displayName: 'Cloud Scheduler Invoker',
  },
  { provider }
)

const invokerCanRunJob = new gcp.cloudrunv2.JobIamMember(
  `${tag}-extractor-invoker-can-run-job`,
  {
    name: extractorJob.name,
    location: gcpRegion,
    role: 'roles/run.invoker',
    member: pulumi.interpolate`serviceAccount:${invokerServiceAccount.email}`,
  },
  { provider }
)

/**
 * Allow Cloud Scheduler Service Agent to create OIDC tokens for the invoker service account.
 * This is required for Cloud Scheduler to authenticate when calling the Cloud Run job.
 */
const projectInfo = gcp.organizations.getProjectOutput(
  { projectId: gcpProject },
  { provider }
)

const schedulerServiceAgentEmail = projectInfo.number.apply(
  (n) => `service-${n}@gcp-sa-cloudscheduler.iam.gserviceaccount.com`
)

const schedulerTokenCreator = new gcp.serviceaccount.IAMMember(
  `${tag}-extractor-scheduler-token-creator`,
  {
    serviceAccountId: invokerServiceAccount.name, // or invokerServiceAccount.id depending on provider versions
    role: 'roles/iam.serviceAccountTokenCreator',
    member: pulumi.interpolate`serviceAccount:${schedulerServiceAgentEmail}`,
  },
  { provider }
)

export const extractorJobScheduler = new gcp.cloudscheduler.Job(
  `${tag}-extractor-job-scheduler`,
  {
    description: 'Trigger Extractor Cloud RunJob on configured schedule',
    schedule: extractorSchedule,
    timeZone: 'UTC',
    httpTarget: {
      httpMethod: 'POST',
      uri: pulumi.interpolate`https://${gcpRegion}-run.googleapis.com/v2/projects/${gcpProject}/locations/${gcpRegion}/jobs/${extractorJob.name}:run`,
      oauthToken: {
        serviceAccountEmail: invokerServiceAccount.email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
      },
    },
  },
  {
    provider,
    dependsOn: [cloudSchedulerService, invokerCanRunJob, schedulerTokenCreator],
  }
)
