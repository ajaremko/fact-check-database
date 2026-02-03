import * as gcp from '@pulumi/gcp'

import { computeService, resourceManagerService } from './services'
import { provider } from './provider'
import { gcpRegion } from './config'

export const artifactRegistry = new gcp.artifactregistry.Repository(
  'shared-artifact-registry',
  {
    location: gcpRegion,
    repositoryId: 'shared-artifact-registry',
    description: 'Application and service artifacts',
    format: 'DOCKER',
  },
  { provider, dependsOn: [computeService, resourceManagerService] }
)
