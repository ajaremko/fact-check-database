import * as gcp from '@pulumi/gcp'

import { provider } from './provider'

export const cloudRunService = new gcp.projects.Service(
  'cloud-run-service',
  {
    service: 'run.googleapis.com',
  },
  { provider }
)
