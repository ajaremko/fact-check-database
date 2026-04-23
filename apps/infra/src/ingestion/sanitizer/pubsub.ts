import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import {
  ingestionLabels,
  gcpRegion,
  tag,
  deadletterRetentionDuration,
} from '../config'
import { provider } from '../provider'
import { pubsubService } from '../services'
import { ingestorTopic } from '../pubsub'

import { sanitizerService } from './cloud-run'

const invokerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-sanitizer-invoker-sa`,
  {
    accountId: `${tag}-sanitizer-invo-sa`,
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
  `${tag}-sanitizer-token-creator`,
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

export const sanitizerDeadletterTopic = new gcp.pubsub.Topic(
  `${tag}-sanitizer-deadletter-topic`,
  {
    name: 'sanitizer-deadletter-topic',
    labels: ingestionLabels,
    messageRetentionDuration: deadletterRetentionDuration,
  },
  {
    dependsOn: [pubsubService],
    provider,
  }
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
      pushEndpoint: sanitizerService.uri,
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
