import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { artifactRegistry } from '../core'

import { gcpRegion, gcpProject, ingestorTag, tag } from './config'
import { provider } from './provider'
import { cloudRunService, cloudSchedulerService } from './services'

const ingestorImage = gcp.artifactregistry.getDockerImageOutput({
  location: artifactRegistry.location,
  repositoryId: artifactRegistry.repositoryId,
  imageName: `apps-ingestor:${ingestorTag}`,
})

export const ingestorJob = new gcp.cloudrunv2.Job(
  `${tag}-ingestor-job`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      template: {
        containers: [
          {
            image: ingestorImage.selfLink,
          },
        ],
      },
    },
  },
  { dependsOn: [cloudRunService], provider }
)

export const ingestorInvokerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-ingestor-invoker-service-account`,
  {
    accountId: 'ingestor-invoker-sa',
    displayName: 'Ingestor Invoker Service Account',
    description:
      'Service account for cloud scheduler to use to invoke ingestor job',
  },
  { provider }
)

export const ingestorInvokerServiceAccountRunInvokerIamMember =
  new gcp.projects.IAMMember(
    `${tag}-ingestor-invoker-service-account-run-invoker-iam-member`,
    {
      project: gcpProject,
      role: 'roles/run.invoker',
      member: pulumi.interpolate`serviceAccount:${ingestorInvokerServiceAccount.email}`,
    },
    { dependsOn: [ingestorInvokerServiceAccount], provider }
  )

export const ingestorJobScheduler = new gcp.cloudscheduler.Job(
  `${tag}-ingestor-job-scheduler`,
  {
    description: 'Trigger Ingestor Cloud Run Job every 15 minutes',
    schedule: '*/15 * * * *',
    timeZone: 'UTC',
    httpTarget: {
      httpMethod: 'POST',
      uri: ingestorJob.name.apply(
        (name) =>
          `https://run.googleapis.com/v2/projects/${gcpProject}/locations/${gcpRegion}/jobs/${name}:run`
      ),
      oidcToken: {
        serviceAccountEmail: ingestorInvokerServiceAccount.email,
      },
    },
  },
  { provider, dependsOn: [cloudSchedulerService] }
)
