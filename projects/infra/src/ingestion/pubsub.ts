import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { ingestionLabels, tag } from './config'
import { pubsubService } from './services'
import { provider } from './provider'
import { eventLogBucket } from './storage'

const project = gcp.organizations.getProjectOutput({}, { provider })

const pubsubServiceAccountBucketReader = new gcp.storage.BucketIAMMember(
  `${tag}-pubsub-service-account-bucket-reader`,
  {
    bucket: eventLogBucket.name,
    role: 'roles/storage.legacyBucketReader',
    member: pulumi.interpolate`serviceAccount:service-${project.number}@gcp-sa-pubsub.iam.gserviceaccount.com`,
  },
  { provider, dependsOn: [pubsubService] }
)

const pubsubServiceAccountObjectCreator = new gcp.storage.BucketIAMMember(
  `${tag}-pubsub-service-account-object-creator`,
  {
    bucket: eventLogBucket.name,
    role: 'roles/storage.objectCreator',
    member: pulumi.interpolate`serviceAccount:service-${project.number}@gcp-sa-pubsub.iam.gserviceaccount.com`,
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
      pubsubServiceAccountBucketReader,
      pubsubServiceAccountObjectCreator,
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
      pubsubServiceAccountBucketReader,
      pubsubServiceAccountObjectCreator,
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
      pubsubServiceAccountBucketReader,
      pubsubServiceAccountObjectCreator,
    ],
    provider,
  }
)
