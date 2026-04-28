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
      filenameDatetimeFormat: 'YYYY-MM-DD/hh_mm_ssZ',
      maxBytes: 1000,
      maxDuration: '300s',
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
