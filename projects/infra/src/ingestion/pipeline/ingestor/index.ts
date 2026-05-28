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

import { ingestorContentRequestResultsCounterMetric } from './metrics'

export const ingestorContentRequestResultsCounterMetricType =
  ingestorContentRequestResultsCounterMetric.type
