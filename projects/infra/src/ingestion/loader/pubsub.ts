import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import {
  deadletterBucket,
  pubsubServiceAccountDeadletterBucketReader,
  pubsubServiceAccountDeadletterObjectCreator,
} from '../deadletter'
import { extractorTopic, pubsubServiceAccountEmail } from '../pubsub'
import { ingestionLabels, gcpRegion, tag } from '../config'
import { provider } from '../provider'
import { pubsubService } from '../services'

import { loaderService } from './cloud-run'

const invokerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-loader-invoker-sa`,
  {
    accountId: `${tag}-loader-invoker-sa`,
    displayName: 'Ingestion Loader Invoker',
  },
  { provider }
)

const invokerCanRunJob = new gcp.cloudrunv2.ServiceIamMember(
  `${tag}-loader-invoker-can-run-job`,
  {
    name: loaderService.name,
    location: gcpRegion,
    role: 'roles/run.invoker',
    member: pulumi.interpolate`serviceAccount:${invokerServiceAccount.email}`,
  },
  { provider }
)

const invokerCanAuthenticate = new gcp.serviceaccount.IAMMember(
  `${tag}-loader-token-creator`,
  {
    serviceAccountId: invokerServiceAccount.name,
    role: 'roles/iam.serviceAccountTokenCreator',
    member: pulumi.interpolate`serviceAccount:${invokerServiceAccount.email}`,
  },
  { provider }
)

export const loaderExtractorDeadletterTopic = new gcp.pubsub.Topic(
  `${tag}-loader-extractor-deadletter-topic`,
  {
    name: 'loader-extractor-deadletter-topic',
    labels: ingestionLabels,
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
)

const pubsubServiceAccountDeadletterPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-pubsub-service-account-loader-extractor-deadletter-publisher`,
  {
    topic: loaderExtractorDeadletterTopic.name,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
  },
  { provider }
)

export const loaderExtractorTopicSubscription = new gcp.pubsub.Subscription(
  `${tag}-loader-extractor-topic-subscription`,
  {
    name: 'loader-extractor-topic-subscription',
    labels: ingestionLabels,
    // Use id instead of name to support separate parent projects
    topic: extractorTopic.id,
    ackDeadlineSeconds: 60,
    retryPolicy: {
      minimumBackoff: '10s',
      maximumBackoff: '600s',
    },
    deadLetterPolicy: {
      deadLetterTopic: loaderExtractorDeadletterTopic.id,
      maxDeliveryAttempts: 5,
    },
    pushConfig: {
      pushEndpoint: pulumi.interpolate`${loaderService.uri}/extractor-topic-messages`,
      oidcToken: {
        serviceAccountEmail: invokerServiceAccount.email,
      },
      attributes: {
        'x-goog-version': 'v1',
      },
    },
  },
  {
    dependsOn: [pubsubService, invokerCanRunJob, invokerCanAuthenticate],
    provider,
  }
)

const pubsubServiceAccountDeadletterSubscriber =
  new gcp.pubsub.SubscriptionIAMMember(
    `${tag}-pubsub-service-account-loader-extractor-dl-subscriber`,
    {
      subscription: loaderExtractorTopicSubscription.name,
      role: 'roles/pubsub.subscriber',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider }
  )

export const loaderExtractorDeadletterTopicLogSubscription =
  new gcp.pubsub.Subscription(
    `${tag}-loader-extractor-deadletter-topic-log-subscription`,
    {
      name: 'loader-extractor-deadletter-topic-log-subscription',
      topic: loaderExtractorDeadletterTopic.name,
      cloudStorageConfig: {
        bucket: deadletterBucket.name,
        filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
        filenamePrefix: 'loader/extractor-events/',
        maxMessages: 1000,
      },
      labels: ingestionLabels,
    },
    {
      dependsOn: [
        pubsubServiceAccountDeadletterSubscriber,
        pubsubServiceAccountDeadletterPublisher,
        pubsubServiceAccountDeadletterBucketReader,
        pubsubServiceAccountDeadletterObjectCreator,
      ],
      provider,
    }
  )
