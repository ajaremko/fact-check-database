import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag, gcpProject } from '../config'
import { archiveBucketName } from '../archive'
import { provider } from '../project'
import { sourceListSecretId } from '../assets'

export const ingestorServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-ingestion-sa`,
  {
    accountId: `${tag}-ingestor`,
    displayName: 'Ingestor Job Service Account',
  },
  { provider }
)

const sourceListSecretAccessorBinding = new gcp.secretmanager.SecretIamMember(
  `${tag}-ingestor-source-list-secret-accessor`,
  {
    secretId: sourceListSecretId,
    role: 'roles/secretmanager.secretAccessor',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)

const ingestorRawArchiveBucketCreator = new gcp.storage.BucketIAMMember(
  `${tag}-ingestor-raw-archive-bucket-creator`,
  {
    bucket: archiveBucketName,
    role: 'roles/storage.objectCreator',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)

const cloudtraceAgent = new gcp.projects.IAMMember(
  `${tag}-ingestor-trace-agent`,
  {
    project: gcpProject,
    role: 'roles/cloudtrace.agent',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)

const telemetryTracesWriter = new gcp.projects.IAMMember(
  `${tag}-ingestor-telemetry-traces-writer`,
  {
    project: gcpProject,
    role: 'roles/telemetry.tracesWriter',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)

const monitoringMetricWriter = new gcp.projects.IAMMember(
  `${tag}-ingestor-monitoring-metric-writer`,
  {
    project: gcpProject,
    role: 'roles/monitoring.metricWriter',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)

export const ingestorServiceAccountIamBindings = [
  sourceListSecretAccessorBinding,
  ingestorRawArchiveBucketCreator,
  cloudtraceAgent,
  telemetryTracesWriter,
  monitoringMetricWriter,
]
