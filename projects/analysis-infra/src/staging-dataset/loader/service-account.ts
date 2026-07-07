import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, stagingStorageBucketName, tag } from '../../config'
import { provider } from '../../project'

import { stagingDataset } from '../bigquery'

export const stagingDatasetLoaderServiceAccount =
  new gcp.serviceaccount.Account(
    `${tag}-staging-loader-sa`,
    {
      accountId: `${tag}-staging-loader-sa`,
      displayName: 'Staging Dataset Loader (Analysis)',
    },
    { provider, dependsOn: [stagingDataset] }
  )

export const stagingDatasetLoaderStagingBucketViewer =
  new gcp.storage.BucketIAMMember(
    `${tag}-staging-dataset-loader-staging-bucket-viewer`,
    {
      bucket: stagingStorageBucketName,
      role: 'roles/storage.objectViewer',
      member: pulumi.interpolate`serviceAccount:${stagingDatasetLoaderServiceAccount.email}`,
    },
    { provider }
  )

export const stagingDatasetLoaderBigQueryDataEditor =
  new gcp.bigquery.DatasetIamMember(
    `${tag}-staging-dataset-loader-bigquery-data-editor`,
    {
      datasetId: stagingDataset.datasetId, // not stagingDataset.id
      role: 'roles/bigquery.dataEditor',
      member: pulumi.interpolate`serviceAccount:${stagingDatasetLoaderServiceAccount.email}`,
      project: gcpProject,
    },
    { provider }
  )

export const stagingDatasetLoaderBigQueryJobUser = new gcp.projects.IAMMember(
  `${tag}-staging-dataset-loader-bigquery-job-user`,
  {
    role: 'roles/bigquery.jobUser',
    member: pulumi.interpolate`serviceAccount:${stagingDatasetLoaderServiceAccount.email}`,
    project: gcpProject,
  },
  { provider }
)

export const stagingDatasetLoaderCloudtraceAgent = new gcp.projects.IAMMember(
  `${tag}-staging-dataset-loader-trace-agent`,
  {
    project: gcpProject,
    role: 'roles/cloudtrace.agent',
    member: pulumi.interpolate`serviceAccount:${stagingDatasetLoaderServiceAccount.email}`,
  },
  { provider }
)

export const stagingDatasetLoaderTelemetryTracesWriter =
  new gcp.projects.IAMMember(
    `${tag}-staging-dataset-loader-telemetry-traces-writer`,
    {
      project: gcpProject,
      role: 'roles/telemetry.tracesWriter',
      member: pulumi.interpolate`serviceAccount:${stagingDatasetLoaderServiceAccount.email}`,
    },
    { provider }
  )

export const stagingDatasetLoaderMonitoringMetricWriter =
  new gcp.projects.IAMMember(
    `${tag}-staging-dataset-loader-monitoring-metric-writer`,
    {
      project: gcpProject,
      role: 'roles/monitoring.metricWriter',
      member: pulumi.interpolate`serviceAccount:${stagingDatasetLoaderServiceAccount.email}`,
    },
    { provider }
  )
