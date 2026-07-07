import {
  stagingStorageSubscription,
  loaderDeadletterTopic,
  loaderDeadletterTopicArchiveSubscription,
  loaderInvokerServiceAccount,
} from './subscription'

export const loaderSubscriptionName = stagingStorageSubscription.name
export const loaderDeadletterTopicName = loaderDeadletterTopic.name
export const loaderDeadletterTopicArchiveSubscriptionName =
  loaderDeadletterTopicArchiveSubscription.name
export const loaderInvokerServiceAccountEmail =
  loaderInvokerServiceAccount.email

import { loaderService } from './service'

export const loaderServiceName = loaderService.name

import { loaderBatchesLoadedCounterMetric } from './metrics'

export const loaderBatchesLoadedCounterMetricType =
  loaderBatchesLoadedCounterMetric.type

import { deadletterBucket } from './storage'

export const deadletterBucketName = deadletterBucket.name
