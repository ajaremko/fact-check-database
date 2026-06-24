import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, stagingStorageBucketName, tag } from '../../config'
import { provider } from '../../project'

import { stagingDataset } from '../bigquery'

export const loaderServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-loader-sa`,
  {
    accountId: `${tag}-loader-sa`,
    displayName: 'Staging Dataset Loader (Analysis)',
  },
  { provider, dependsOn: [stagingDataset] }
)

export const loaderStagingBucketViewer = new gcp.storage.BucketIAMMember(
  `${tag}-loader-staging-bucket-viewer`,
  {
    bucket: stagingStorageBucketName,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${loaderServiceAccount.email}`,
  },
  { provider }
)

export const loaderBigQueryDataEditor = new gcp.bigquery.DatasetIamMember(
  `${tag}-loader-bigquery-data-editor`,
  {
    datasetId: stagingDataset.datasetId, // not stagingDataset.id
    role: 'roles/bigquery.dataEditor',
    member: pulumi.interpolate`serviceAccount:${loaderServiceAccount.email}`,
    project: gcpProject,
  },
  { provider }
)

export const loaderBigQueryJobUser = new gcp.projects.IAMMember(
  `${tag}-loader-bigquery-job-user`,
  {
    role: 'roles/bigquery.jobUser',
    member: pulumi.interpolate`serviceAccount:${loaderServiceAccount.email}`,
    project: gcpProject,
  },
  { provider }
)

export const cloudtraceAgent = new gcp.projects.IAMMember(
  `${tag}-loader-trace-agent`,
  {
    project: gcpProject,
    role: 'roles/cloudtrace.agent',
    member: pulumi.interpolate`serviceAccount:${loaderServiceAccount.email}`,
  },
  { provider }
)

export const telemetryTracesWriter = new gcp.projects.IAMMember(
  `${tag}-loader-telemetry-traces-writer`,
  {
    project: gcpProject,
    role: 'roles/telemetry.tracesWriter',
    member: pulumi.interpolate`serviceAccount:${loaderServiceAccount.email}`,
  },
  { provider }
)

export const monitoringMetricWriter = new gcp.projects.IAMMember(
  `${tag}-loader-monitoring-metric-writer`,
  {
    project: gcpProject,
    role: 'roles/monitoring.metricWriter',
    member: pulumi.interpolate`serviceAccount:${loaderServiceAccount.email}`,
  },
  { provider }
)
