import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, stagingStorageBucketName, tag } from '../config'
import { archiveBucketName } from '../archive'
import { provider } from '../project'

import { extractorSubscription } from './subscription'

export const extractorServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-extractor-sa`,
  {
    accountId: `${tag}-extractor`,
    displayName: 'Extractor Job Service Account',
  },
  { provider }
)

export const extractorRawArchiveBucketViewer = new gcp.storage.BucketIAMMember(
  `${tag}-extractor-raw-archive-bucket-viewer`,
  {
    bucket: archiveBucketName,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${extractorServiceAccount.email}`,
  },
  { provider }
)

export const stagingStorageBucketCreator = new gcp.storage.BucketIAMMember(
  `${tag}-extractor-staging-bucket-creator`,
  {
    bucket: stagingStorageBucketName,
    role: 'roles/storage.objectCreator',
    member: pulumi.interpolate`serviceAccount:${extractorServiceAccount.email}`,
  },
  { provider }
)

export const extractorSanitizerTopicSubscriber =
  new gcp.pubsub.SubscriptionIAMMember(
    `${tag}-extractor-sanitizer-topic-subscriber`,
    {
      subscription: extractorSubscription.name,
      role: 'roles/pubsub.subscriber',
      member: pulumi.interpolate`serviceAccount:${extractorServiceAccount.email}`,
    },
    { provider }
  )

export const cloudtraceAgent = new gcp.projects.IAMMember(
  `${tag}-extractor-trace-agent`,
  {
    project: gcpProject,
    role: 'roles/cloudtrace.agent',
    member: pulumi.interpolate`serviceAccount:${extractorServiceAccount.email}`,
  },
  { provider }
)

export const telemetryTracesWriter = new gcp.projects.IAMMember(
  `${tag}-extractor-telemetry-traces-writer`,
  {
    project: gcpProject,
    role: 'roles/telemetry.tracesWriter',
    member: pulumi.interpolate`serviceAccount:${extractorServiceAccount.email}`,
  },
  { provider }
)

export const monitoringMetricWriter = new gcp.projects.IAMMember(
  `${tag}-extractor-monitoring-metric-writer`,
  {
    project: gcpProject,
    role: 'roles/monitoring.metricWriter',
    member: pulumi.interpolate`serviceAccount:${extractorServiceAccount.email}`,
  },
  { provider }
)
