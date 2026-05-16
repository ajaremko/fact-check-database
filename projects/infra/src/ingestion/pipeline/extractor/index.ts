import { extractorTopic, extractorTopicArchiveSubscription } from './topic'

export const extractorTopicName = extractorTopic.name
export const extractorTopicArchiveSubscriptionName =
  extractorTopicArchiveSubscription.name

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
import { extractorJob } from './job'

export const extractorJobName = extractorJob.name

export const extractorJobSchedulerName = extractorJobScheduler.name
