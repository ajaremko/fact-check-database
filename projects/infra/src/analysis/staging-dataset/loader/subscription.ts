import * as pulumi from '@pulumi/pulumi'
import * as gcp from '@pulumi/gcp'

import { createInvokerServiceAccount } from '../../../ingestion/pipeline/createInvokerServiceAccount'
import { stagingStorageTopicName } from '../../../core'

import { analysisLabels, gcpRegion, tag } from '../../config'
import { provider, pubsubServiceAccountEmail } from '../../project'
import { pubsubService } from '../../services'

import { loaderService } from './service'
import { deadletterBucket } from './storage'

export const {
  serviceAccount: loaderInvokerServiceAccount,
  serviceAccountInvoker: loaderInvokerServiceAccountInvoker,
} = createInvokerServiceAccount({
  name: 'loader-push',
  serviceName: loaderService.name,
  displayName: 'Ingestion Loader Invoker',
  type: 'service',
})

const serviceAccount = new gcp.serviceaccount.Account(
  `${tag}-loader-push-sa`,
  {
    accountId: `${tag}-loader-push-sa`,
    displayName: 'Analysis Loader Invoker',
  },
  { provider }
)

const serviceAccountInvoker = new gcp.cloudrunv2.ServiceIamMember(
  `${tag}-loader-push-invoker`,
  {
    name: loaderService.name,
    location: gcpRegion,
    role: 'roles/run.invoker',
    member: pulumi.interpolate`serviceAccount:${serviceAccount.email}`,
  },
  { provider }
)

const loaderInvokerServiceAccountTokenCreator =
  new gcp.serviceaccount.IAMMember(
    `${tag}-loader-push-token-creator`,
    {
      serviceAccountId: loaderInvokerServiceAccount.name,
      role: 'roles/iam.serviceAccountTokenCreator',
      member: pulumi.interpolate`serviceAccount:${loaderInvokerServiceAccount.email}`,
    },
    { provider }
  )

export const pubsubServiceAccountDeadletterBucketReader =
  new gcp.storage.BucketIAMMember(
    `${tag}-pubsub-sa-deadletter-bucket-reader`,
    {
      bucket: deadletterBucket.name,
      role: 'roles/storage.legacyBucketReader',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn: [pubsubService] }
  )

export const pubsubServiceAccountDeadletterObjectCreator =
  new gcp.storage.BucketIAMMember(
    `${tag}-pubsub-sa-deadletter-object-creator`,
    {
      bucket: deadletterBucket.name,
      role: 'roles/storage.objectCreator',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn: [pubsubService] }
  )

// create the deadletter topic to write failed messages to
export const loaderDeadletterTopic = new gcp.pubsub.Topic(
  `${tag}-loader-deadletter-topic`,
  { labels: analysisLabels },
  { dependsOn: [pubsubService], provider }
)

// grant the pubsub service account permissions to publish
// to the deadletter topic
const pubsubServiceAccountPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-pubsub-sa-loader-deadletter-publisher`,
  {
    topic: loaderDeadletterTopic.name,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
  },
  { provider }
)

// create the subscription with a deadletter policy that
// sends failed messages to the deadletter topic
export const loaderSubscription = new gcp.pubsub.Subscription(
  `${tag}-loader-deadletter-topic-archive-subscription`,
  {
    topic: stagingStorageTopicName,
    deadLetterPolicy: {
      deadLetterTopic: loaderDeadletterTopic.id,
      maxDeliveryAttempts: 5,
    },
    retryPolicy: {
      minimumBackoff: '10s',
      maximumBackoff: '600s',
    },
    pushConfig: {
      pushEndpoint: pulumi.interpolate`${loaderService.uri}/extractor-topic-messages`,
      oidcToken: {
        serviceAccountEmail: loaderInvokerServiceAccount.email,
      },
      attributes: {
        'x-goog-version': 'v1',
      },
    },
    labels: analysisLabels,
  },
  {
    provider,
    dependsOn: [
      loaderInvokerServiceAccountTokenCreator,
      pubsubServiceAccountDeadletterBucketReader,
      pubsubServiceAccountDeadletterObjectCreator,
      pubsubServiceAccountPublisher,
      serviceAccountInvoker,
    ],
  }
)

// grant the pubsub service account permissions to access
// the subscription
const pubsubServiceAccountSubscriber = new gcp.pubsub.SubscriptionIAMMember(
  `${tag}-pubsub-sa-loader-deadletter-subscriber`,
  {
    subscription: loaderSubscription.name,
    role: 'roles/pubsub.subscriber',
    member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
  },
  { provider }
)

// create a subscription to the deadletter topic that
// writes messages to the deadletter bucket once
// all permissions are in place
export const loaderDeadletterTopicArchiveSubscription =
  new gcp.pubsub.Subscription(
    `${tag}-loader-deadletter-archive-subscription`,
    {
      topic: loaderDeadletterTopic.name,
      messageRetentionDuration: '604800s', // 7 days
      cloudStorageConfig: {
        bucket: deadletterBucket.name,
        filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
        filenamePrefix: 'loader-deadletter/',
        maxMessages: 1000,
      },
      labels: analysisLabels,
    },
    {
      dependsOn: [
        pubsubServiceAccountPublisher,
        pubsubServiceAccountSubscriber,
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

// import { loaderService } from './service'

// const invokerServiceAccount = new gcp.serviceaccount.Account(
//   `${tag}-loader-invoker-sa`,
//   {
//     accountId: `${tag}-loader-invoker-sa`,
//     displayName: 'Ingestion Loader Invoker',
//   },
//   { provider }
// )

// const invokerCanRunJob = new gcp.cloudrunv2.ServiceIamMember(
//   `${tag}-loader-invoker-can-run-job`,
//   {
//     name: loaderService.name,
//     location: gcpRegion,
//     role: 'roles/run.invoker',
//     member: pulumi.interpolate`serviceAccount:${invokerServiceAccount.email}`,
//   },
//   { provider }
// )

// const invokerCanAuthenticate = new gcp.serviceaccount.IAMMember(
//   `${tag}-loader-token-creator`,
//   {
//     serviceAccountId: invokerServiceAccount.name,
//     role: 'roles/iam.serviceAccountTokenCreator',
//     member: pulumi.interpolate`serviceAccount:${invokerServiceAccount.email}`,
//   },
//   { provider }
// )

// export const loaderExtractorDeadletterTopic = new gcp.pubsub.Topic(
//   `${tag}-loader-extractor-deadletter-topic`,
//   {
//     name: 'loader-extractor-deadletter-topic',
//     labels: ingestionLabels,
//   },
//   {
//     dependsOn: [pubsubService],
//     provider,
//   }
// )

// const pubsubServiceAccountDeadletterPublisher = new gcp.pubsub.TopicIAMMember(
//   `${tag}-pubsub-service-account-loader-extractor-deadletter-publisher`,
//   {
//     topic: loaderExtractorDeadletterTopic.name,
//     role: 'roles/pubsub.publisher',
//     member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
//   },
//   { provider }
// )

// export const loaderExtractorTopicSubscription = new gcp.pubsub.Subscription(
//   `${tag}-loader-extractor-topic-subscription`,
//   {
//     name: 'loader-extractor-topic-subscription',
//     labels: ingestionLabels,
//     // Use extractorTopic.id instead of extractorTopicName to support separate parent projects
//     topic: extractorTopicName,
//     ackDeadlineSeconds: 60,
//     retryPolicy: {
//       minimumBackoff: '10s',
//       maximumBackoff: '600s',
//     },
//     deadLetterPolicy: {
//       deadLetterTopic: loaderExtractorDeadletterTopic.id,
//       maxDeliveryAttempts: 5,
//     },
//     pushConfig: {
//       pushEndpoint: pulumi.interpolate`${loaderService.uri}/extractor-topic-messages`,
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
//     `${tag}-pubsub-service-account-loader-extractor-dl-subscriber`,
//     {
//       subscription: loaderExtractorTopicSubscription.name,
//       role: 'roles/pubsub.subscriber',
//       member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
//     },
//     { provider }
//   )

// export const loaderExtractorDeadletterTopicLogSubscription =
//   new gcp.pubsub.Subscription(
//     `${tag}-loader-extractor-deadletter-topic-log-subscription`,
//     {
//       name: 'loader-extractor-deadletter-topic-log-subscription',
//       topic: loaderExtractorDeadletterTopic.name,
//       cloudStorageConfig: {
//         bucket: deadletterBucketName,
//         filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
//         filenamePrefix: 'loader/extractor-events/',
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
