import * as gcp from '@pulumi/gcp'

import { gcpRegion, gcpProject, ingestorTag } from './config'
import { provider } from './provider'
import { cloudRunService, cloudSchedulerService } from './services'
import { artifactRegistry } from '../core'

const ingestorImage = gcp.artifactregistry.getDockerImageOutput({
  location: artifactRegistry.location,
  repositoryId: artifactRegistry.repositoryId,
  imageName: `apps-ingestor:${ingestorTag}`,
})

export const ingestorJob = new gcp.cloudrunv2.Job(
  'ingestor-job',
  {
    location: gcpRegion,
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

const computeServiceAccount = gcp.compute.getDefaultServiceAccountOutput()

export const ingestorJobScheduler = new gcp.cloudscheduler.Job(
  'ingestor-job-scheduler',
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
        serviceAccountEmail: computeServiceAccount.email,
      },
    },
  },
  { provider, dependsOn: [cloudSchedulerService] }
)
