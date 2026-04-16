import * as gcp from '@pulumi/gcp'

import { ingestionLabels, tag } from './config'
import { pubsubService } from './services'
import { provider } from './provider'

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

export const sanitizerDeadletterTopic = new gcp.pubsub.Topic(
  `${tag}-sanitizer-deadletter-topic`,
  {
    name: 'sanitizer-deadletter-topic',
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

export const extractorDeadletterTopic = new gcp.pubsub.Topic(
  `${tag}-extractor-deadletter-topic`,
  {
    name: 'extractor-deadletter-topic',
    labels: ingestionLabels,
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
)
