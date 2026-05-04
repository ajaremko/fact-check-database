import { sanitizerService } from './cloud-run'
import { sanitizerIngestorTopicSubscription } from './pubsub'

export const sanitizerWorkerName = sanitizerService.name
export const sanitizerIngestorTopicSubscriptionName =
  sanitizerIngestorTopicSubscription.name
