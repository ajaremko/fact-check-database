import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { assetsBucketName } from '../assets'
import { provider } from '../project'
import { archiveBucketName } from '../archive'
import { gcpProject, tag } from '../config'

import { sanitizerTopic } from './topic'

export const sanitizerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-sanitizer-sa`,
  {
    accountId: `${tag}-sanitizer`,
    displayName: 'Sanitizer Service Account',
  },
  { provider }
)

export const sanitizerAssetBucketViewer = new gcp.storage.BucketIAMMember(
  `${tag}-sanitizer-asset-bucket-viewer`,
  {
    bucket: assetsBucketName,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
  },
  { provider }
)

export const sanitizerRawArchiveBucketAdmin = new gcp.storage.BucketIAMMember(
  `${tag}-sanitizer-raw-archive-bucket-admin`,
  {
    bucket: archiveBucketName,
    role: 'roles/storage.objectAdmin',
    member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
  },
  { provider }
)

export const sanitizerTopicPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-sanitizer-topic-publisher`,
  {
    topic: sanitizerTopic.name,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
  },
  { provider }
)

export const cloudtraceAgent = new gcp.projects.IAMMember(
  `${tag}-sanitizer-trace-agent`,
  {
    project: gcpProject,
    role: 'roles/cloudtrace.agent',
    member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
  },
  { provider }
)

export const telemetryTracesWriter = new gcp.projects.IAMMember(
  `${tag}-sanitizer-telemetry-traces-writer`,
  {
    project: gcpProject,
    role: 'roles/telemetry.tracesWriter',
    member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
  },
  { provider }
)

export const monitoringMetricWriter = new gcp.projects.IAMMember(
  `${tag}-sanitizer-monitoring-metric-writer`,
  {
    project: gcpProject,
    role: 'roles/monitoring.metricWriter',
    member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
  },
  { provider }
)
