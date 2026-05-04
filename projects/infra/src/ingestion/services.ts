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

export const storageService = new gcp.projects.Service(
  `${tag}-storage-service`,
  {
    service: 'storage.googleapis.com',
  },
  { provider }
)

export const pubsubService = new gcp.projects.Service(
  `${tag}-pubsub-service`,
  {
    service: 'pubsub.googleapis.com',
  },
  { provider }
)

export const observabilityService = new gcp.projects.Service(
  `${tag}-observability-service`,
  {
    service: 'observability.googleapis.com',
  },
  { provider }
)

export const cloudTraceService = new gcp.projects.Service(
  `${tag}-cloud-trace-service`,
  {
    service: 'cloudtrace.googleapis.com',
  },
  { provider }
)

export const telemetryService = new gcp.projects.Service(
  `${tag}-telemetry-service`,
  {
    service: 'telemetry.googleapis.com',
  },
  { provider }
)

export const monitoringService = new gcp.projects.Service(
  `${tag}-monitoring-service`,
  {
    service: 'monitoring.googleapis.com',
  },
  { provider }
)

export const dataflowService = new gcp.projects.Service(
  `${tag}-dataflow-service`,
  {
    service: 'dataflow.googleapis.com',
  },
  { provider }
)
