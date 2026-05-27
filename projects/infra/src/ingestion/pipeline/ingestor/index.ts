import { ingestorTopic, ingestorTopicArchiveSubscription } from './topic'

export const ingestorTopicName = ingestorTopic.name
export const ingestorTopicArchiveSubscriptionName =
  ingestorTopicArchiveSubscription.name

import { ingestorJob } from './job'

export const ingestorJobName = ingestorJob.name

import {
  ingestorJobScheduler,
  ingestorInvokerServiceAccount,
} from './scheduler'

export const ingestorJobSchedulerName = ingestorJobScheduler.name
export const ingestorInvokerServiceAccountEmail =
  ingestorInvokerServiceAccount.email

import {
  ingestorRequestCounterMetric,
  ingestorRequestFailureCounterMetric,
  ingestorResponseCounterMetric,
} from './metrics'

export const ingestorRequestCounterMetricType =
  ingestorRequestCounterMetric.type
export const ingestorRequestFailureCounterMetricType =
  ingestorRequestFailureCounterMetric.type
export const ingestorResponseCounterMetricType =
  ingestorResponseCounterMetric.type
