import * as gcp from '@pulumi/gcp'

import { ingestionLabels, tag } from '../config'
import { sanitizerTopic } from '../pubsub'
import { provider } from '../provider'
import { pubsubService } from '../services'

import { createDeadletterTopic } from '../deadletter'

export const {
  topic: extractorDeadletterTopic,
  subscription: extractorDeadletterTopicLogSubscription,
} = createDeadletterTopic({
  name: 'extractor-deadletter',
  cloudStorageConfig: {
    filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
    filenamePrefix: 'extractor/',
    maxMessages: 1000,
  },
})

// const pubsubServiceAccountDeadletterPublisher = new gcp.pubsub.TopicIAMMember(
//   `${tag}-pubsub-sa-extractor-deadletter-publisher`,
//   {
//     topic: extractorDeadletterTopic.name,
//     role: 'roles/pubsub.publisher',
//     member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
//   },
//   { provider }
// )

export const extractorSubscription = new gcp.pubsub.Subscription(
  `${tag}-extractor-subscription`,
  {
    name: 'extractor-subscription',
    labels: ingestionLabels,
    // Use id instead of name to support separate parent projects
    topic: sanitizerTopic.id,
    ackDeadlineSeconds: 60,
    deadLetterPolicy: {
      deadLetterTopic: extractorDeadletterTopic.id,
      maxDeliveryAttempts: 5,
    },
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
)

// const pubsubServiceAccountDeadletterSubscriber =
//   new gcp.pubsub.SubscriptionIAMMember(
//     `${tag}-pubsub-sa-extractor-deadletter-subscriber`,
//     {
//       subscription: extractorSanitizerTopicSubscription.name,
//       role: 'roles/pubsub.subscriber',
//       member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
//     },
//     { provider }
//   )

// export const extractorDeadletterTopicLogSubscription =
//   new gcp.pubsub.Subscription(
//     `${tag}-extractor-deadletter-topic-log-subscription`,
//     {
//       name: 'extractor-deadletter-topic-log-subscription',
//       topic: extractorDeadletterTopic.name,
//       cloudStorageConfig: {
//         bucket: deadletterBucket.name,
//         filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
//         filenamePrefix: 'extractor/',
//         maxMessages: 1000,
//       },
//       labels: ingestionLabels,
//     },
//     {
//       dependsOn: [
//         pubsubServiceAccountDeadletterSubscriber,
//         pubsubServiceAccountDeadletterPublisher,
//         pubsubServiceAccountDeadletterBucketReader,
//         pubsubServiceAccountDeadletterObjectCreator,
//       ],
//       provider,
//     }
//   )
