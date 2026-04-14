import { loaderService } from './cloud-run'
import { loaderExtractorTopicSubscription } from './pubsub'

export const loaderServiceName = loaderService.name
export const loaderExtractorTopicSubscriptionName =
  loaderExtractorTopicSubscription.name
