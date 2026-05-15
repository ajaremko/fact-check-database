import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, tag } from '../config'
import { assetsBucket, stagingBucket, rawArchiveBucket } from '../storage'
import { provider } from '../provider'
import { extractorTopic } from '../pubsub'

import { extractorSubscription } from './messaging'

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
    bucket: rawArchiveBucket.name,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${extractorServiceAccount.email}`,
  },
  { provider }
)

export const extractorAssetsBucketViewer = new gcp.storage.BucketIAMMember(
  `${tag}-extractor-assets-bucket-viewer`,
  {
    bucket: assetsBucket.name,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${extractorServiceAccount.email}`,
  },
  { provider }
)

export const extractorStagingBucketCreator = new gcp.storage.BucketIAMMember(
  `${tag}-extractor-staging-bucket-creator`,
  {
    bucket: stagingBucket.name,
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

export const extractorTopicPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-extractor-topic-publisher`,
  {
    topic: extractorTopic.name,
    role: 'roles/pubsub.publisher',
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
