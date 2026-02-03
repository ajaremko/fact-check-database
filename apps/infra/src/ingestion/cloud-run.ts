import * as gcp from '@pulumi/gcp'

import { gcpRegion, ingestorTag } from './config'
import { provider } from './provider'
import { cloudRunService } from './services'
import { artifactRegistry } from '../core'

const appImage = gcp.artifactregistry.getDockerImageOutput({
  location: artifactRegistry.location,
  repositoryId: artifactRegistry.repositoryId,
  imageName: `apps-ingestor:${ingestorTag}`,
})

export const ingestorService = new gcp.cloudrunv2.Service(
  'ingestor-service',
  {
    location: gcpRegion,
    template: {
      containers: [
        {
          image: appImage.selfLink,
        },
      ],
    },
  },
  { dependsOn: [cloudRunService], provider }
)

// Make the service publicly accessible by granting the 'roles/run.invoker' role to 'allUsers'
export const iamIngestor = new gcp.cloudrunv2.ServiceIamMember(
  'ingestor-everyone',
  {
    name: ingestorService.name,
    location: gcpRegion,
    role: 'roles/run.invoker',
    member: 'allUsers',
  },
  { provider }
)
