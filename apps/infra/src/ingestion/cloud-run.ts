import * as gcp from '@pulumi/gcp'

import { gcpRegion, ingestorTag } from './config'
import { provider } from './provider'
import { cloudRunService } from './services'
import { artifactRegistry } from '../core'

const ingestorImage = gcp.artifactregistry.getDockerImageOutput({
  location: artifactRegistry.location,
  repositoryId: artifactRegistry.repositoryId,
  imageName: `apps-ingestor:${ingestorTag}`,
})

export const ingestorJob = new gcp.cloudrunv2.Job(
  'ingestor-service',
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
