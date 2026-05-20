import {
  loaderSubscription,
  loaderDeadletterTopic,
  loaderDeadletterTopicArchiveSubscription,
  loaderInvokerServiceAccount,
} from './subscription'

export const loaderSubscriptionName = loaderSubscription.name
export const loaderDeadletterTopicName = loaderDeadletterTopic.name
export const loaderDeadletterTopicArchiveSubscriptionName =
  loaderDeadletterTopicArchiveSubscription.name
export const loaderInvokerServiceAccountEmail =
  loaderInvokerServiceAccount.email

import { loaderService } from './service'

export const loaderServiceName = loaderService.name

import { loaderBatchesLoadedCounterMetric } from './metrics'

export const loaderBatchesLoadedCounterMetricName =
  loaderBatchesLoadedCounterMetric.name
