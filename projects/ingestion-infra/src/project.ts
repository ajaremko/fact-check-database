import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { coreRegion, coreProject, gcpProject, gcpRegion, tag } from './config'

export const provider = new gcp.Provider(`${tag}-provider`, {
  project: gcpProject,
  region: gcpRegion,
})

export const project = gcp.organizations.getProjectOutput({}, { provider })

export const pubsubServiceAccountEmail = pulumi.interpolate`service-${project.number}@gcp-sa-pubsub.iam.gserviceaccount.com`

export const schedulerServiceAgentEmail = pulumi.interpolate`service-${project.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com`

export const cloudRunServiceAgentEmail = pulumi.interpolate`service-${project.number}@serverless-robot-prod.iam.gserviceaccount.com`

export const coreProvider = new gcp.Provider(`${tag}-core-provider`, {
  project: coreProject,
  region: coreRegion,
})
