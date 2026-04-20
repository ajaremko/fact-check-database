import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { rawArchiveBucketName } from '../../core'

import { tag, gcpProject } from '../config'
import { provider } from '../provider'
import { assetsBucket } from '../storage'
import { ingestorTopic } from '../pubsub'

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
    bucket: assetsBucket.name,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)

export const ingestorRawArchiveBucketCreator = new gcp.storage.BucketIAMMember(
  `${tag}-ingestor-raw-archive-bucket-creator`,
  {
    bucket: rawArchiveBucketName,
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
