import * as gcp from '@pulumi/gcp'

import { ingestionLabels, tag } from '../config'
import { provider } from '../provider'
import { pubsubService } from '../services'
import { ingestorTopic } from '../pubsub'

export const sanitizerIngestorTopicSubscription = new gcp.pubsub.Subscription(
  `${tag}-sanitizer-ingestor-topic-subscription`,
  {
    name: 'sanitizer-ingestor-topic-subscription',
    labels: ingestionLabels,
    // Use id instead of name to support separate parent projects
    topic: ingestorTopic.id,
    ackDeadlineSeconds: 60,
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
)
