import * as gcp from '@pulumi/gcp'

import { provider } from './provider'

export const cloudRunService = new gcp.projects.Service(
  'cloud-run-service',
  {
    service: 'run.googleapis.com',
  },
  { provider }
)

export const cloudSchedulerService = new gcp.projects.Service(
  'cloud-scheduler-service',
  {
    service: 'cloudscheduler.googleapis.com',
  },
  { provider }
)
