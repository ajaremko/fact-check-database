import {
  ingestorTopic,
  ingestorTopicArchiveSubscription,
  ingestorStorageUploadNotification,
} from './topic'

export const ingestorTopicName = ingestorTopic.name
export const ingestorTopicArchiveSubscriptionName =
  ingestorTopicArchiveSubscription.name
export const ingestorStorageUploadNotificationId =
  ingestorStorageUploadNotification.id

import { ingestorJob } from './job'

export const ingestorJobName = ingestorJob.name

export * from './scheduler'

import { ingestorContentRequestResultsCounterMetric } from './metrics'

export const ingestorContentRequestResultsCounterMetricType =
  ingestorContentRequestResultsCounterMetric.type
