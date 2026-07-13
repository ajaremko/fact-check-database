import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { provider } from '../project'
import { archiveBucketName } from '../archive'
import { gcpProject, tag } from '../config'
import { sanitizerPolicySecretId } from '../assets'

export const sanitizerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-sanitizer-sa`,
  {
    accountId: `${tag}-sanitizer`,
    displayName: 'Sanitizer Service Account',
  },
  { provider }
)

const sanitizerPolicySecretAccessorBinding =
  new gcp.secretmanager.SecretIamMember(
    `${tag}-sanitizer-policy-secret-accessor`,
    {
      secretId: sanitizerPolicySecretId,
      role: 'roles/secretmanager.secretAccessor',
      member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
    },
    { provider }
  )

const sanitizerRawArchiveBucketAdmin = new gcp.storage.BucketIAMMember(
  `${tag}-sanitizer-raw-archive-bucket-admin`,
  {
    bucket: archiveBucketName,
    role: 'roles/storage.objectAdmin',
    member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
  },
  { provider }
)

const cloudtraceAgent = new gcp.projects.IAMMember(
  `${tag}-sanitizer-trace-agent`,
  {
    project: gcpProject,
    role: 'roles/cloudtrace.agent',
    member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
  },
  { provider }
)

const telemetryTracesWriter = new gcp.projects.IAMMember(
  `${tag}-sanitizer-telemetry-traces-writer`,
  {
    project: gcpProject,
    role: 'roles/telemetry.tracesWriter',
    member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
  },
  { provider }
)

const monitoringMetricWriter = new gcp.projects.IAMMember(
  `${tag}-sanitizer-monitoring-metric-writer`,
  {
    project: gcpProject,
    role: 'roles/monitoring.metricWriter',
    member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
  },
  { provider }
)

export const sanitizerServiceAccountIamBindings = [
  sanitizerPolicySecretAccessorBinding,
  sanitizerRawArchiveBucketAdmin,
  cloudtraceAgent,
  telemetryTracesWriter,
  monitoringMetricWriter,
]
