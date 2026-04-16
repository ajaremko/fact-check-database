import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { ingestionLabels, gcpRegion, tag } from '../config'
import { provider } from '../provider'
import { pubsubService } from '../services'
import { extractorTopic } from '../pubsub'

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
      pushEndpoint: loaderService.uri,
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
