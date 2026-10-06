import * as pulumi from '@pulumi/pulumi'
import * as gcp from '@pulumi/gcp'

import { websiteLabels, gcpRegion, tag } from '../config'
import { provider, pubsubServiceAccountEmail } from '../project'
import { pubsubService } from '../services'
import { formSubmissionTopic } from '../backend/topic'
import {
  deadletterBucketName,
  pubsubServiceAccountIamRoles,
} from '../deadletter'

import { emailerService } from './service'

export const emailerInvokerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-emailer-push-sa`,
  {
    accountId: `${tag}-emailer-push-sa`,
    displayName: 'Website Emailer Invoker',
  },
  { provider }
)

const emailerInvokerServiceAccountInvoker = new gcp.cloudrunv2.ServiceIamMember(
  `${tag}-emailer-push-invoker`,
  {
    name: emailerService.name,
    location: gcpRegion,
    role: 'roles/run.invoker',
    member: pulumi.interpolate`serviceAccount:${emailerInvokerServiceAccount.email}`,
  },
  { provider }
)

const emailerInvokerServiceAccountTokenCreator =
  new gcp.serviceaccount.IAMMember(
    `${tag}-emailer-push-token-creator`,
    {
      serviceAccountId: emailerInvokerServiceAccount.name,
      role: 'roles/iam.serviceAccountTokenCreator',
      member: pulumi.interpolate`serviceAccount:${emailerInvokerServiceAccount.email}`,
    },
    { provider }
  )

// create the deadletter topic to write failed messages to
export const emailerDeadletterTopic = new gcp.pubsub.Topic(
  `${tag}-emailer-deadletter-topic`,
  { labels: websiteLabels },
  { dependsOn: [pubsubService], provider }
)

// grant the pubsub service account permissions to publish
// to the deadletter topic
const pubsubServiceAccountPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-pubsub-sa-emailer-deadletter-publisher`,
  {
    topic: emailerDeadletterTopic.name,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
  },
  { provider }
)

// create the subscription with a deadletter policy that
// sends failed messages to the deadletter topic
export const confirmationEmailSubscription = new gcp.pubsub.Subscription(
  `${tag}-confirmation-email-subscription`,
  {
    topic: formSubmissionTopic.name,
    deadLetterPolicy: {
      deadLetterTopic: emailerDeadletterTopic.id,
      maxDeliveryAttempts: 5,
    },
    retryPolicy: {
      minimumBackoff: '10s',
      maximumBackoff: '600s',
    },
    pushConfig: {
      pushEndpoint: pulumi.interpolate`${emailerService.uri}/confirmation-email`,
      oidcToken: {
        serviceAccountEmail: emailerInvokerServiceAccount.email,
      },
      attributes: {
        'x-goog-version': 'v1',
      },
    },
    labels: websiteLabels,
  },
  {
    provider,
    dependsOn: [
      emailerInvokerServiceAccountTokenCreator,
      ...pubsubServiceAccountIamRoles,
      pubsubServiceAccountPublisher,
      emailerInvokerServiceAccountInvoker,
    ],
  }
)

export const notificationEmailSubscription = new gcp.pubsub.Subscription(
  `${tag}-notification-email-subscription`,
  {
    topic: formSubmissionTopic.name,
    retryPolicy: {
      minimumBackoff: '10s',
      maximumBackoff: '600s',
    },
    pushConfig: {
      pushEndpoint: pulumi.interpolate`${emailerService.uri}/notification-email`,
      oidcToken: {
        serviceAccountEmail: emailerInvokerServiceAccount.email,
      },
      attributes: {
        'x-goog-version': 'v1',
      },
    },
    labels: websiteLabels,
  },
  {
    provider,
    dependsOn: [
      emailerInvokerServiceAccountTokenCreator,
      ...pubsubServiceAccountIamRoles,
      pubsubServiceAccountPublisher,
      emailerInvokerServiceAccountInvoker,
    ],
  }
)

// grant the pubsub service account permissions to access
// the subscription
const pubsubServiceAccountConfirmationEmailSubscriber =
  new gcp.pubsub.SubscriptionIAMMember(
    `${tag}-pubsub-sa-emailer-confirmation-email-subscriber`,
    {
      subscription: confirmationEmailSubscription.name,
      role: 'roles/pubsub.subscriber',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider }
  )

const pubsubServiceAccountNotificationEmailSubscriber =
  new gcp.pubsub.SubscriptionIAMMember(
    `${tag}-pubsub-sa-emailer-notification-email-subscriber`,
    {
      subscription: notificationEmailSubscription.name,
      role: 'roles/pubsub.subscriber',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider }
  )

// create a subscription to the deadletter topic that
// writes messages to the deadletter bucket once
// all permissions are in place
export const emailerDeadletterTopicArchiveSubscription =
  new gcp.pubsub.Subscription(
    `${tag}-emailer-deadletter-archive-subscription`,
    {
      topic: emailerDeadletterTopic.name,
      messageRetentionDuration: '604800s', // 7 days
      cloudStorageConfig: {
        bucket: deadletterBucketName,
        filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
        filenamePrefix: 'emailer-deadletter/',
        maxMessages: 1000,
      },
      labels: websiteLabels,
    },
    {
      dependsOn: [
        pubsubServiceAccountPublisher,
        pubsubServiceAccountConfirmationEmailSubscriber,
        pubsubServiceAccountNotificationEmailSubscriber,
        ...pubsubServiceAccountIamRoles,
      ],
      provider,
    }
  )
