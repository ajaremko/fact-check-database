import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { archiveBucketName } from '../../archive'
import { tag, gcpProject } from '../../config'
import { provider } from '../../project'
import { assetsBucketName } from '../../assets'

import { ingestorTopic } from './topic'

export const ingestorServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-ingestion-sa`,
  {
    accountId: `${tag}-ingestor`,
    displayName: 'Ingestor Job Service Account',
  },
  { provider }
)

export const ingestorAssetBucketViewer = new gcp.storage.BucketIAMMember(
  `${tag}-ingestor-asset-bucket-viewer`,
  {
    bucket: assetsBucketName,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)

export const ingestorRawArchiveBucketCreator = new gcp.storage.BucketIAMMember(
  `${tag}-ingestor-raw-archive-bucket-creator`,
  {
    bucket: archiveBucketName,
    role: 'roles/storage.objectCreator',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)

export const ingestorTopicPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-ingestor-topic-publisher`,
  {
    topic: ingestorTopic.name,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)

export const cloudtraceAgent = new gcp.projects.IAMMember(
  `${tag}-ingestor-trace-agent`,
  {
    project: gcpProject,
    role: 'roles/cloudtrace.agent',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)

export const telemetryTracesWriter = new gcp.projects.IAMMember(
  `${tag}-ingestor-telemetry-traces-writer`,
  {
    project: gcpProject,
    role: 'roles/telemetry.tracesWriter',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)

export const monitoringMetricWriter = new gcp.projects.IAMMember(
  `${tag}-ingestor-monitoring-metric-writer`,
  {
    project: gcpProject,
    role: 'roles/monitoring.metricWriter',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)
