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
  ingestorRequestFailuresMetric,
  ingestorResponseCodeFrequencyMetric,
  ingestorRequestsMetric,
} from './metrics'

export const ingestorRequestsMetricName = ingestorRequestsMetric.name
export const ingestorRequestFailuresMetricName =
  ingestorRequestFailuresMetric.name
export const ingestorResponseCodeFrequencyMetricName =
  ingestorResponseCodeFrequencyMetric.name
