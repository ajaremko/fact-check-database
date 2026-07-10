import * as pulumi from '@pulumi/pulumi'
import * as gcp from '@pulumi/gcp'

import {
  websiteLabels,
  coreProject,
  gcpRegion,
  stagingStorageTopicName,
  tag,
} from '../../config'
import {
  coreProvider,
  provider,
  pubsubServiceAccountEmail,
} from '../../project'
import {
  deadletterBucketName,
  pubsubServiceAccountIamRoles,
} from '../../deadletter'
import { pubsubService } from '../../services'

import { loaderService } from './service'

export const loaderInvokerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-loader-push-sa`,
  {
    accountId: `${tag}-loader-push-sa`,
    displayName: 'Analysis Loader Invoker',
  },
  { provider }
)

export const loaderInvokerServiceAccountInvoker =
  new gcp.cloudrunv2.ServiceIamMember(
    `${tag}-loader-push-invoker`,
    {
      name: loaderService.name,
      location: gcpRegion,
      role: 'roles/run.invoker',
      member: pulumi.interpolate`serviceAccount:${loaderInvokerServiceAccount.email}`,
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

// create the deadletter topic to write failed messages to
export const loaderDeadletterTopic = new gcp.pubsub.Topic(
  `${tag}-staging-storage-deadletter-topic`,
  { labels: websiteLabels },
  { dependsOn: [pubsubService], provider }
)

// grant the pubsub service account permissions to publish
// to the deadletter topic
const pubsubServiceAccountPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-pubsub-sa-staging-storage-topic-deadletter-publisher`,
  {
    topic: loaderDeadletterTopic.name,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
  },
  { provider }
)

// grant the pubsub service account permissions to access
// the subscription
const pubsubServiceAccountStagingStorageSubscriber =
  new gcp.pubsub.TopicIAMMember(
    `${tag}-pubsub-sa-staging-storage-topic-subscriber`,
    {
      topic: stagingStorageTopicName,
      project: coreProject,
      role: 'roles/pubsub.subscriber',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider: coreProvider }
  )

// create the subscription with a deadletter policy that
// sends failed messages to the deadletter topic
export const stagingStorageSubscription = new gcp.pubsub.Subscription(
  `${tag}-staging-storage-subscription`,
  {
    topic: pulumi.interpolate`projects/${coreProject}/topics/${stagingStorageTopicName}`,
    deadLetterPolicy: {
      deadLetterTopic: loaderDeadletterTopic.id,
      maxDeliveryAttempts: 5,
    },
    retryPolicy: {
      minimumBackoff: '10s',
      maximumBackoff: '600s',
    },
    pushConfig: {
      pushEndpoint: pulumi.interpolate`${loaderService.uri}/load-jobs`,
      oidcToken: {
        serviceAccountEmail: loaderInvokerServiceAccount.email,
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
      pubsubServiceAccountStagingStorageSubscriber,
      loaderInvokerServiceAccountTokenCreator,
      pubsubServiceAccountPublisher,
      loaderInvokerServiceAccountInvoker,
      ...pubsubServiceAccountIamRoles,
    ],
  }
)

// grant the pubsub service account permissions to access
// the subscription
const pubsubServiceAccountSubscriber = new gcp.pubsub.SubscriptionIAMMember(
  `${tag}-pubsub-sa-staging-storage-deadletter-subscriber`,
  {
    subscription: stagingStorageSubscription.name,
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
        bucket: deadletterBucketName,
        filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
        filenamePrefix: 'loader-deadletter/',
        maxMessages: 1000,
      },
      labels: websiteLabels,
    },
    {
      dependsOn: [
        pubsubServiceAccountPublisher,
        pubsubServiceAccountSubscriber,
        ...pubsubServiceAccountIamRoles,
      ],
      provider,
    }
  )
