import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import {
  deadletterBucket,
  pubsubServiceAccountDeadletterBucketReader,
  pubsubServiceAccountDeadletterObjectCreator,
} from '../deadletter'
import { ingestionLabels, gcpRegion, tag } from '../config'
import { ingestorTopic, pubsubServiceAccountEmail } from '../pubsub'
import { provider } from '../provider'
import { pubsubService } from '../services'

import { sanitizerService } from './cloud-run'

const invokerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-sanitizer-invoker-sa`,
  {
    accountId: `${tag}-sanitizer-invoker-sa`,
    displayName: 'Ingestion Sanitizer Invoker',
  },
  { provider }
)

const invokerCanRunJob = new gcp.cloudrunv2.ServiceIamMember(
  `${tag}-sanitizer-invoker-can-run-job`,
  {
    name: sanitizerService.name,
    location: gcpRegion,
    role: 'roles/run.invoker',
    member: pulumi.interpolate`serviceAccount:${invokerServiceAccount.email}`,
  },
  { provider }
)

const invokerCanAuthenticate = new gcp.serviceaccount.IAMMember(
  `${tag}-sanitizer-invoker-token-creator`,
  {
    serviceAccountId: invokerServiceAccount.name,
    role: 'roles/iam.serviceAccountTokenCreator',
    member: pulumi.interpolate`serviceAccount:${invokerServiceAccount.email}`,
  },
  { provider }
)

export const sanitizerIngestorDeadletterTopic = new gcp.pubsub.Topic(
  `${tag}-sanitizer-ingestor-deadletter-topic`,
  {
    name: 'sanitizer-ingestor-deadletter-topic',
    labels: ingestionLabels,
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
)

const pubsubServiceAccountDeadletterPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-pubsub-sa-sanitizer-ingestor-deadletter-publisher`,
  {
    topic: sanitizerIngestorDeadletterTopic.name,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
  },
  { provider }
)

export const sanitizerIngestorTopicSubscription = new gcp.pubsub.Subscription(
  `${tag}-sanitizer-ingestor-topic-subscription`,
  {
    name: 'sanitizer-ingestor-topic-subscription',
    labels: ingestionLabels,
    // Use id instead of name to support separate parent projects
    topic: ingestorTopic.id,
    ackDeadlineSeconds: 60,
    retryPolicy: {
      minimumBackoff: '10s',
      maximumBackoff: '600s',
    },
    deadLetterPolicy: {
      deadLetterTopic: sanitizerIngestorDeadletterTopic.id,
      maxDeliveryAttempts: 5,
    },
    pushConfig: {
      pushEndpoint: pulumi.interpolate`${sanitizerService.uri}/ingestor-topic-messages`,
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
    `${tag}-pubsub-sa-sanitizer-ingestor-dl-subscriber`,
    {
      subscription: sanitizerIngestorTopicSubscription.name,
      role: 'roles/pubsub.subscriber',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider }
  )

export const sanitizerIngestorDeadletterTopicLogSubscription =
  new gcp.pubsub.Subscription(
    `${tag}-sanitizer-ingestor-deadletter-topic-log-subscription`,
    {
      name: 'sanitizer-ingestor-deadletter-topic-log-subscription',
      topic: sanitizerIngestorDeadletterTopic.name,
      cloudStorageConfig: {
        bucket: deadletterBucket.name,
        filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
        filenamePrefix: 'sanitizer/ingestor-events/',
        maxMessages: 1000,
      },
      labels: ingestionLabels,
    },
    {
      dependsOn: [
        pubsubServiceAccountDeadletterBucketReader,
        pubsubServiceAccountDeadletterObjectCreator,
        pubsubServiceAccountDeadletterSubscriber,
        pubsubServiceAccountDeadletterPublisher,
      ],
      provider,
    }
  )
