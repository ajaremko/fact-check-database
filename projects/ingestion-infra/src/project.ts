import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, gcpRegion, tag } from './config'

export const provider = new gcp.Provider(tag, {
  project: gcpProject,
  region: gcpRegion,
})

export const project = gcp.organizations.getProjectOutput({}, { provider })

export const pubsubServiceAccountEmail = pulumi.interpolate`service-${project.number}@gcp-sa-pubsub.iam.gserviceaccount.com`

export const schedulerServiceAgentEmail = pulumi.interpolate`service-${project.number}@gcp-sa-cloudscheduler.iam.gserviceaccount.com`
