import {
  sanitizerTopic,
  sanitizerTopicArchiveSubscription,
  sanitizerStorageUploadNotification,
} from './topic'

export const sanitizerTopicName = sanitizerTopic.name
export const sanitizerTopicArchiveSubscriptionName =
  sanitizerTopicArchiveSubscription.name
export const sanitizerStorageUploadNotificationId =
  sanitizerStorageUploadNotification.id

import {
  sanitizerSubscription,
  sanitizerDeadletterTopic,
  sanitizerDeadletterTopicArchiveSubscription,
} from './subscription'

export const sanitizerSubscriptionName = sanitizerSubscription.name
export const sanitizerDeadletterTopicName = sanitizerDeadletterTopic.name
export const sanitizerDeadletterTopicArchiveSubscriptionName =
  sanitizerDeadletterTopicArchiveSubscription.name

import { sanitizerService } from './service'

export const sanitizerServiceName = sanitizerService.name

import { sanitizerServiceAccount } from './service-account'

export const sanitizerServiceAccountEmail = sanitizerServiceAccount.email

import { sanitizerRecordsCounterMetric } from './metrics'

export const sanitizerRecordsCounterMetricType =
  sanitizerRecordsCounterMetric.type
