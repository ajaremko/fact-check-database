import {
  submissionSubscription,
  emailerDeadletterTopic,
  emailerDeadletterTopicArchiveSubscription,
  emailerInvokerServiceAccount,
} from './subscription'

export const emailerSubscriptionName = submissionSubscription.name
export const emailerDeadletterTopicName = emailerDeadletterTopic.name
export const emailerDeadletterTopicArchiveSubscriptionName =
  emailerDeadletterTopicArchiveSubscription.name
export const emailerInvokerServiceAccountEmail =
  emailerInvokerServiceAccount.email

import { emailerService } from './service'

export const emailerServiceName = emailerService.name

import { submissionsDeadletterBucket } from './storage'

export const submissionsDeadletterBucketName = submissionsDeadletterBucket.name

import { resendApiKey } from './resend'

export const resendApiKeySecretId = resendApiKey.secretId
export const resendApiKeyName = resendApiKey.name
