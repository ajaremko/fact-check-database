import * as gcp from '@pulumi/gcp'

import { labels } from './config'
import { pubsubService } from './services'

export const observationsTopic = new gcp.pubsub.Topic(
  'observations-topic',
  {
    name: 'observations-topic',
    labels,
  },
  {
    dependsOn: [pubsubService],
  }
)
