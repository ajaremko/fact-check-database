import * as gcp from '@pulumi/gcp'

import { sharedLabels } from './config'
import { pubsubService } from './services'
import { provider } from './provider'

export const observationsTopic = new gcp.pubsub.Topic(
  'observations-topic',
  {
    name: 'observations-topic',
    labels: sharedLabels,
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
)
