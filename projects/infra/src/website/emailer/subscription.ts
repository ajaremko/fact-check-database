import * as pulumi from '@pulumi/pulumi'
import * as gcp from '@pulumi/gcp'

import { websiteLabels, gcpRegion, tag } from '../config'
import { provider, pubsubServiceAccountEmail } from '../project'
import { pubsubService } from '../services'
import { formSubmissionTopic } from '../server/topic'

import { emailerService } from './service'
import { submissionsDeadletterBucket } from './storage'

const emailerInvokerServiceAccount = new gcp.serviceaccount.Account(
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

export const pubsubServiceAccountDeadletterBucketReader =
  new gcp.storage.BucketIAMMember(
    `${tag}-pubsub-sa-deadletter-bucket-reader`,
    {
      bucket: submissionsDeadletterBucket.name,
      role: 'roles/storage.legacyBucketReader',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn: [pubsubService] }
  )

export const pubsubServiceAccountDeadletterObjectCreator =
  new gcp.storage.BucketIAMMember(
    `${tag}-pubsub-sa-deadletter-object-creator`,
    {
      bucket: submissionsDeadletterBucket.name,
      role: 'roles/storage.objectCreator',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn: [pubsubService] }
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
export const submissionSubscription = new gcp.pubsub.Subscription(
  `${tag}-submission-subscription`,
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
      pushEndpoint: pulumi.interpolate`${emailerService.uri}/submissions`,
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
      pubsubServiceAccountDeadletterBucketReader,
      pubsubServiceAccountDeadletterObjectCreator,
      pubsubServiceAccountPublisher,
      emailerInvokerServiceAccountInvoker,
    ],
  }
)

export const confirmationSubscription = new gcp.pubsub.Subscription(
  `${tag}-confirmation-subscription`,
  {
    topic: formSubmissionTopic.name,
    retryPolicy: {
      minimumBackoff: '10s',
      maximumBackoff: '600s',
    },
    pushConfig: {
      pushEndpoint: pulumi.interpolate`${emailerService.uri}/confirmations`,
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
      pubsubServiceAccountDeadletterBucketReader,
      pubsubServiceAccountDeadletterObjectCreator,
      pubsubServiceAccountPublisher,
      emailerInvokerServiceAccountInvoker,
    ],
  }
)

// grant the pubsub service account permissions to access
// the subscription
const pubsubServiceAccountSubmissionSubscriber =
  new gcp.pubsub.SubscriptionIAMMember(
    `${tag}-pubsub-sa-emailer-submission-subscriber`,
    {
      subscription: submissionSubscription.name,
      role: 'roles/pubsub.subscriber',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider }
  )

const pubsubServiceAccountConfirmationSubscriber =
  new gcp.pubsub.SubscriptionIAMMember(
    `${tag}-pubsub-sa-emailer-confirmation-subscriber`,
    {
      subscription: confirmationSubscription.name,
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
        bucket: submissionsDeadletterBucket.name,
        filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
        filenamePrefix: 'emailer-deadletter/',
        maxMessages: 1000,
      },
      labels: websiteLabels,
    },
    {
      dependsOn: [
        pubsubServiceAccountPublisher,
        pubsubServiceAccountSubmissionSubscriber,
        pubsubServiceAccountConfirmationSubscriber,
        pubsubServiceAccountDeadletterBucketReader,
        pubsubServiceAccountDeadletterObjectCreator,
      ],
      provider,
    }
  )

// import {
//   deadletterBucketName,
//   deadletterPermissionBindings,
// } from '../../deadletter'
// import { provider, pubsubServiceAccountEmail } from '../../project'
// import { extractorTopicName } from '../../messaging'
// import { ingestionLabels, gcpRegion, tag } from '../../config'
// import { pubsubService } from '../../services'

// import { emailerService } from './service'

// const invokerServiceAccount = new gcp.serviceaccount.Account(
//   `${tag}-emailer-invoker-sa`,
//   {
//     accountId: `${tag}-emailer-invoker-sa`,
//     displayName: 'Ingestion Loader Invoker',
//   },
//   { provider }
// )

// const invokerCanRunJob = new gcp.cloudrunv2.ServiceIamMember(
//   `${tag}-emailer-invoker-can-run-job`,
//   {
//     name: emailerService.name,
//     location: gcpRegion,
//     role: 'roles/run.invoker',
//     member: pulumi.interpolate`serviceAccount:${invokerServiceAccount.email}`,
//   },
//   { provider }
// )

// const invokerCanAuthenticate = new gcp.serviceaccount.IAMMember(
//   `${tag}-emailer-token-creator`,
//   {
//     serviceAccountId: invokerServiceAccount.name,
//     role: 'roles/iam.serviceAccountTokenCreator',
//     member: pulumi.interpolate`serviceAccount:${invokerServiceAccount.email}`,
//   },
//   { provider }
// )

// export const emailerExtractorDeadletterTopic = new gcp.pubsub.Topic(
//   `${tag}-emailer-extractor-deadletter-topic`,
//   {
//     name: 'emailer-extractor-deadletter-topic',
//     labels: ingestionLabels,
//   },
//   {
//     dependsOn: [pubsubService],
//     provider,
//   }
// )

// const pubsubServiceAccountDeadletterPublisher = new gcp.pubsub.TopicIAMMember(
//   `${tag}-pubsub-service-account-emailer-extractor-deadletter-publisher`,
//   {
//     topic: emailerExtractorDeadletterTopic.name,
//     role: 'roles/pubsub.publisher',
//     member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
//   },
//   { provider }
// )

// export const emailerExtractorTopicSubscription = new gcp.pubsub.Subscription(
//   `${tag}-emailer-extractor-topic-subscription`,
//   {
//     name: 'emailer-extractor-topic-subscription',
//     labels: ingestionLabels,
//     // Use extractorTopic.id instead of extractorTopicName to support separate parent projects
//     topic: extractorTopicName,
//     ackDeadlineSeconds: 60,
//     retryPolicy: {
//       minimumBackoff: '10s',
//       maximumBackoff: '600s',
//     },
//     deadLetterPolicy: {
//       deadLetterTopic: emailerExtractorDeadletterTopic.id,
//       maxDeliveryAttempts: 5,
//     },
//     pushConfig: {
//       pushEndpoint: pulumi.interpolate`${emailerService.uri}/extractor-topic-messages`,
//       oidcToken: {
//         serviceAccountEmail: invokerServiceAccount.email,
//       },
//       attributes: {
//         'x-goog-version': 'v1',
//       },
//     },
//   },
//   {
//     dependsOn: [pubsubService, invokerCanRunJob, invokerCanAuthenticate],
//     provider,
//   }
// )

// const pubsubServiceAccountDeadletterSubscriber =
//   new gcp.pubsub.SubscriptionIAMMember(
//     `${tag}-pubsub-service-account-emailer-extractor-dl-subscriber`,
//     {
//       subscription: emailerExtractorTopicSubscription.name,
//       role: 'roles/pubsub.subscriber',
//       member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
//     },
//     { provider }
//   )

// export const emailerExtractorDeadletterTopicLogSubscription =
//   new gcp.pubsub.Subscription(
//     `${tag}-emailer-extractor-deadletter-topic-log-subscription`,
//     {
//       name: 'emailer-extractor-deadletter-topic-log-subscription',
//       topic: emailerExtractorDeadletterTopic.name,
//       cloudStorageConfig: {
//         bucket: deadletterBucketName,
//         filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
//         filenamePrefix: 'emailer/extractor-events/',
//         maxMessages: 1000,
//       },
//       labels: ingestionLabels,
//     },
//     {
//       dependsOn: [
//         ...deadletterPermissionBindings,
//         pubsubServiceAccountDeadletterSubscriber,
//         pubsubServiceAccountDeadletterPublisher,
//       ],
//       provider,
//     }
//   )
