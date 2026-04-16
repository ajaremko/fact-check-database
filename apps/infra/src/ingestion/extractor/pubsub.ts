import * as gcp from '@pulumi/gcp'

import { ingestionLabels, tag } from '../config'
import { provider } from '../provider'
import { pubsubService } from '../services'
import { sanitizerTopic } from '../pubsub'

export const extractorSanitizerDeadletterTopic = new gcp.pubsub.Topic(
  `${tag}-extractor-sanitizer-deadletter-topic`,
  {
    name: 'extractor-sanitizer-deadletter-topic',
    labels: ingestionLabels,
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
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
