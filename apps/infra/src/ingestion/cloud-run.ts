import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { artifactRegistry } from '../core'

import {
  gcpRegion,
  gcpProject,
  ingestorTag,
  ingestorSchedule,
  tag,
} from './config'
import { cloudRunService, cloudSchedulerService } from './services'
import { provider } from './provider'

// If an ingestor image is specified in config, use that. Otherwise, fall back to a public sample image.
function getIngestorImageUri(tag?: string): pulumi.Output<string> {
  if (!tag) {
    console.warn(
      'No ingestorTag specified in config, using public sample image.'
    )
    return pulumi.output('gcr.io/google-samples/hello-app:1.0')
  }

  const image = gcp.artifactregistry.getDockerImageOutput(
    {
      location: artifactRegistry.location,
      repositoryId: artifactRegistry.repositoryId,
      imageName: `apps-ingestor:${tag}`,
    },
    { provider }
  )

  return image.selfLink
}

export const ingestorJob = new gcp.cloudrunv2.Job(
  `${tag}-ingestor-job`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      template: {
        containers: [
          {
            image: getIngestorImageUri(ingestorTag),
          },
        ],
      },
    },
  },
  { dependsOn: [cloudRunService], provider }
)

const invokerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-scheduler-invoker-sa`,
  {
    accountId: `${tag}-scheduler-invoker`,
    displayName: 'Cloud Scheduler OIDC Invoker',
  },
  { provider }
)

const invokerCanRunJob = new gcp.cloudrunv2.JobIamMember(
  `${tag}-invoker-can-run-job`,
  {
    name: ingestorJob.name,
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
  `${tag}-scheduler-token-creator`,
  {
    serviceAccountId: invokerServiceAccount.name, // or invokerServiceAccount.id depending on provider versions
    role: 'roles/iam.serviceAccountTokenCreator',
    member: pulumi.interpolate`serviceAccount:${schedulerServiceAgentEmail}`,
  },
  { provider }
)

export const ingestorJobScheduler = new gcp.cloudscheduler.Job(
  `${tag}-ingestor-job-scheduler`,
  {
    description: 'Trigger Ingestor Cloud RunJob on configured schedule',
    schedule: ingestorSchedule,
    timeZone: 'UTC',
    httpTarget: {
      httpMethod: 'POST',
      uri: pulumi.interpolate`https://${gcpRegion}-run.googleapis.com/v2/projects/${gcpProject}/locations/${gcpRegion}/jobs/${ingestorJob.name}:run`,
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
