import {
  extractorSubscription,
  extractorDeadletterTopic,
  extractorDeadletterTopicArchiveSubscription,
} from './subscription'

export const extractorSubscriptionName = extractorSubscription.name
export const extractorDeadletterTopicName = extractorDeadletterTopic.name
export const extractorDeadletterTopicArchiveSubscriptionName =
  extractorDeadletterTopicArchiveSubscription.name

import { extractorJobScheduler } from './scheduler'
export const extractorJobSchedulerName = extractorJobScheduler.name

import { extractorJob } from './job'
export const extractorJobName = extractorJob.name

import {
  extractorBatchesWrittenCounterMetric,
  extractorFactCheckRowCounterMetric,
} from './metrics'

export const extractorFactCheckRowCounterMetricType =
  extractorFactCheckRowCounterMetric.type
export const extractorBatchesWrittenCounterMetricType =
  extractorBatchesWrittenCounterMetric.type
