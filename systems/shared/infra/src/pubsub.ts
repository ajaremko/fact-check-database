import * as gcp from '@pulumi/gcp'

import { pubsubService } from './services'

export const observationsTopic = new gcp.pubsub.Topic(
  'observations-topic',
  {
    name: 'observations-topic',
  },
  {
    dependsOn: [pubsubService],
  }
)
