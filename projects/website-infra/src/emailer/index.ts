import {
  confirmationEmailSubscription,
  emailerDeadletterTopic,
  emailerDeadletterTopicArchiveSubscription,
  emailerInvokerServiceAccount,
} from './subscription'

export const emailerSubscriptionName = confirmationEmailSubscription.name
export const emailerDeadletterTopicName = emailerDeadletterTopic.name
export const emailerDeadletterTopicArchiveSubscriptionName =
  emailerDeadletterTopicArchiveSubscription.name
export const emailerInvokerServiceAccountEmail =
  emailerInvokerServiceAccount.email

import { emailerService } from './service'

export const emailerServiceName = emailerService.name

import { resendApiKey } from './resend'

export const resendApiKeySecretId = resendApiKey.secretId
export const resendApiKeyName = resendApiKey.name
