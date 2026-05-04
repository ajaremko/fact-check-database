import * as gcp from '@pulumi/gcp'

import { coreLabels, tag } from './config'
import { pubsubService } from './services'
import { provider } from './provider'

export const observationsTopic = new gcp.pubsub.Topic(
  `${tag}-observations-topic`,
  {
    name: 'observations-topic',
    labels: coreLabels,
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
)
