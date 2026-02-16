import * as gcp from '@pulumi/gcp'

import { observationsTopicId } from '../../core'

import { ingestionLabels, tag } from '../config'
import { provider } from '../provider'
import { pubsubService } from '../services'

export const sanitizerObservationsSubscription = new gcp.pubsub.Subscription(
  `${tag}-sanitizer-observations-subscription`,
  {
    name: 'sanitizer-observations-subscription',
    labels: ingestionLabels,
    topic: observationsTopicId,
    ackDeadlineSeconds: 60,
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
)
