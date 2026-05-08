import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { ingestionLabels, tag } from './config'
import { pubsubService } from './services'
import { provider } from './provider'
import { eventLogBucket, deadletterBucket } from './storage'

const project = gcp.organizations.getProjectOutput({}, { provider })

export const pubsubServiceAccountEmail = pulumi.interpolate`service-${project.number}@gcp-sa-pubsub.iam.gserviceaccount.com`

const pubsubServiceAccountEventLogBucketReader =
  new gcp.storage.BucketIAMMember(
    `${tag}-pubsub-sa-event-log-bucket-reader`,
    {
      bucket: eventLogBucket.name,
      role: 'roles/storage.legacyBucketReader',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn: [pubsubService] }
  )

const pubsubServiceAccountEventLogObjectCreator =
  new gcp.storage.BucketIAMMember(
    `${tag}-pubsub-sa-event-log-object-creator`,
    {
      bucket: eventLogBucket.name,
      role: 'roles/storage.objectCreator',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn: [pubsubService] }
  )

export const pubsubServiceAccountDeadletterBucketReader =
  new gcp.storage.BucketIAMMember(
    `${tag}-pubsub-sa-deadletter-bucket-reader`,
    {
      bucket: deadletterBucket.name,
      role: 'roles/storage.legacyBucketReader',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn: [pubsubService] }
  )

export const pubsubServiceAccountDeadletterObjectCreator =
  new gcp.storage.BucketIAMMember(
    `${tag}-pubsub-sa-deadletter-object-creator`,
    {
      bucket: deadletterBucket.name,
      role: 'roles/storage.objectCreator',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn: [pubsubService] }
  )

export const ingestorTopic = new gcp.pubsub.Topic(
  `${tag}-ingestor-topic`,
  {
    name: 'ingestor-topic',
    labels: ingestionLabels,
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
)

export const ingestorTopicLogSubscription = new gcp.pubsub.Subscription(
  `${tag}-ingestor-topic-log-subscription`,
  {
    name: 'ingestor-topic-log-subscription',
    topic: ingestorTopic.name,
    cloudStorageConfig: {
      bucket: eventLogBucket.name,
      filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
      filenamePrefix: 'ingestor-events/',
      maxMessages: 1000,
    },
    labels: ingestionLabels,
  },
  {
    dependsOn: [
      pubsubServiceAccountEventLogBucketReader,
      pubsubServiceAccountEventLogObjectCreator,
    ],
    provider,
  }
)

export const sanitizerTopic = new gcp.pubsub.Topic(
  `${tag}-sanitizer-topic`,
  {
    name: 'sanitizer-topic',
    labels: ingestionLabels,
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
)

export const sanitizerTopicLogSubscription = new gcp.pubsub.Subscription(
  `${tag}-sanitizer-topic-log-subscription`,
  {
    name: 'sanitizer-topic-log-subscription',
    topic: sanitizerTopic.name,
    cloudStorageConfig: {
      bucket: eventLogBucket.name,
      filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
      filenamePrefix: 'sanitizer-events/',
      maxMessages: 1000,
    },
    labels: ingestionLabels,
  },
  {
    dependsOn: [
      pubsubServiceAccountEventLogBucketReader,
      pubsubServiceAccountEventLogObjectCreator,
    ],
    provider,
  }
)

export const extractorTopic = new gcp.pubsub.Topic(
  `${tag}-extractor-topic`,
  {
    name: 'extractor-topic',
    labels: ingestionLabels,
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
)

export const extractorTopicLogSubscription = new gcp.pubsub.Subscription(
  `${tag}-extractor-topic-log-subscription`,
  {
    name: 'extractor-topic-log-subscription',
    topic: extractorTopic.name,
    cloudStorageConfig: {
      bucket: eventLogBucket.name,
      filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
      filenamePrefix: 'extractor-events/',
      maxMessages: 1000,
    },
    labels: ingestionLabels,
  },
  {
    dependsOn: [
      pubsubServiceAccountEventLogBucketReader,
      pubsubServiceAccountEventLogObjectCreator,
    ],
    provider,
  }
)
