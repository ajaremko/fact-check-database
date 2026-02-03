import * as gcp from '@pulumi/gcp'

import { tag } from './config'
import { provider } from './provider'

export const cloudRunService = new gcp.projects.Service(
  `${tag}-cloud-run-service`,
  {
    service: 'run.googleapis.com',
  },
  { provider }
)

export const cloudSchedulerService = new gcp.projects.Service(
  `${tag}-cloud-scheduler-service`,
  {
    service: 'cloudscheduler.googleapis.com',
  },
  { provider }
)
