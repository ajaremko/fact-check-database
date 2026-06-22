import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, tag } from '../config'
import { provider } from '../project'

import { resendApiKey } from './resend'

export const emailerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-emailer-sa`,
  {
    accountId: `${tag}-emailer-sa`,
    displayName: 'Emailer Service Account (Website)',
  },
  { provider }
)

export const secretAccessorBinding = new gcp.secretmanager.SecretIamMember(
  `${tag}-emailer-secret-accessor`,
  {
    secretId: resendApiKey.secretId,
    role: 'roles/secretmanager.secretAccessor',
    member: pulumi.interpolate`serviceAccount:${emailerServiceAccount.email}`,
  },
  { provider }
)

export const cloudtraceAgent = new gcp.projects.IAMMember(
  `${tag}-emailer-trace-agent`,
  {
    project: gcpProject,
    role: 'roles/cloudtrace.agent',
    member: pulumi.interpolate`serviceAccount:${emailerServiceAccount.email}`,
  },
  { provider }
)

export const telemetryTracesWriter = new gcp.projects.IAMMember(
  `${tag}-emailer-telemetry-traces-writer`,
  {
    project: gcpProject,
    role: 'roles/telemetry.tracesWriter',
    member: pulumi.interpolate`serviceAccount:${emailerServiceAccount.email}`,
  },
  { provider }
)

export const monitoringMetricWriter = new gcp.projects.IAMMember(
  `${tag}-emailer-monitoring-metric-writer`,
  {
    project: gcpProject,
    role: 'roles/monitoring.metricWriter',
    member: pulumi.interpolate`serviceAccount:${emailerServiceAccount.email}`,
  },
  { provider }
)

export const iamMembers = [
  secretAccessorBinding,
  cloudtraceAgent,
  telemetryTracesWriter,
  monitoringMetricWriter,
]
