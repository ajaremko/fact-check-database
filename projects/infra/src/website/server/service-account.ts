import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, tag } from '../config'
import { provider } from '../project'

import { envoyConfig } from './envoy'

export const websiteBackendServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-website-backend-sa`,
  {
    accountId: `${tag}-website-backend-sa`,
    displayName: 'Website Backend Service Account',
  },
  { provider }
)

export const secretAccessorBinding = new gcp.secretmanager.SecretIamMember(
  `${tag}-website-backend-secret-accessor`,
  {
    secretId: envoyConfig.secretId,
    role: 'roles/secretmanager.secretAccessor',
    member: pulumi.interpolate`serviceAccount:${websiteBackendServiceAccount.email}`,
  },
  { provider }
)

export const cloudtraceAgent = new gcp.projects.IAMMember(
  `${tag}-website-backend-trace-agent`,
  {
    project: gcpProject,
    role: 'roles/cloudtrace.agent',
    member: pulumi.interpolate`serviceAccount:${websiteBackendServiceAccount.email}`,
  },
  { provider }
)

export const telemetryTracesWriter = new gcp.projects.IAMMember(
  `${tag}-website-backend-telemetry-traces-writer`,
  {
    project: gcpProject,
    role: 'roles/telemetry.tracesWriter',
    member: pulumi.interpolate`serviceAccount:${websiteBackendServiceAccount.email}`,
  },
  { provider }
)

export const monitoringMetricWriter = new gcp.projects.IAMMember(
  `${tag}-website-backend-monitoring-metric-writer`,
  {
    project: gcpProject,
    role: 'roles/monitoring.metricWriter',
    member: pulumi.interpolate`serviceAccount:${websiteBackendServiceAccount.email}`,
  },
  { provider }
)

export const iamMembers = [
  secretAccessorBinding,
  cloudtraceAgent,
  telemetryTracesWriter,
  monitoringMetricWriter,
]
