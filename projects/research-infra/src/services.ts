import * as gcp from '@pulumi/gcp'

import { tag } from './config'
import { provider } from './project'

export const computeService = new gcp.projects.Service(
  `${tag}-compute-service`,
  {
    service: 'compute.googleapis.com',
  },
  { provider }
)

export const resourceManagerService = new gcp.projects.Service(
  `${tag}-resource-manager-service`,
  {
    service: 'cloudresourcemanager.googleapis.com',
  },
  { provider }
)
