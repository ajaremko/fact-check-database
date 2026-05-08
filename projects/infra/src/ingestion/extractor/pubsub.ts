import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { deadletterRetentionDuration, ingestionLabels, tag } from '../config'
import {
  pubsubServiceAccountEmail,
  sanitizerTopic,
  pubsubServiceAccountDeadletterBucketReader,
  pubsubServiceAccountDeadletterObjectCreator,
} from '../pubsub'
import { deadletterBucket } from '../storage'
import { provider } from '../provider'
import { pubsubService } from '../services'

export const extractorSanitizerDeadletterTopic = new gcp.pubsub.Topic(
  `${tag}-extractor-sanitizer-deadletter-topic`,
  {
    name: 'extractor-sanitizer-deadletter-topic',
    labels: ingestionLabels,
    messageRetentionDuration: deadletterRetentionDuration,
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
)

const pubsubServiceAccountDeadletterPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-pubsub-sa-extractor-sanitizer-deadletter-publisher`,
  {
    topic: extractorSanitizerDeadletterTopic.name,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
  },
  { provider }
)

export const extractorSanitizerTopicSubscription = new gcp.pubsub.Subscription(
  `${tag}-extractor-sanitizer-topic-subscription`,
  {
    name: 'extractor-sanitizer-topic-subscription',
    labels: ingestionLabels,
    // Use id instead of name to support separate parent projects
    topic: sanitizerTopic.id,
    ackDeadlineSeconds: 60,
    deadLetterPolicy: {
      deadLetterTopic: extractorSanitizerDeadletterTopic.id,
      maxDeliveryAttempts: 5,
    },
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
)

const pubsubServiceAccountDeadletterSubscriber =
  new gcp.pubsub.SubscriptionIAMMember(
    `${tag}-pubsub-sa-extractor-sanitizer-dl-subscriber`,
    {
      subscription: extractorSanitizerTopicSubscription.name,
      role: 'roles/pubsub.subscriber',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider }
  )

export const extractorSanitizerDeadletterTopicLogSubscription =
  new gcp.pubsub.Subscription(
    `${tag}-extractor-sanitizer-deadletter-topic-log-subscription`,
    {
      name: 'extractor-sanitizer-deadletter-topic-log-subscription',
      topic: extractorSanitizerDeadletterTopic.name,
      cloudStorageConfig: {
        bucket: deadletterBucket.name,
        filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
        filenamePrefix: 'extractor/sanitizer-events/',
        maxMessages: 1000,
      },
      labels: ingestionLabels,
    },
    {
      dependsOn: [
        pubsubServiceAccountDeadletterSubscriber,
        pubsubServiceAccountDeadletterPublisher,
        pubsubServiceAccountDeadletterBucketReader,
        pubsubServiceAccountDeadletterObjectCreator,
      ],
      provider,
    }
  )
