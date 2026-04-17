import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { artifactRegistry, rawArchiveBucketName } from '../../core'

import { gcpRegion, dockerTag, tag } from '../config'
import { stagingBucket } from '../storage'
import { cloudRunService } from '../services'
import { provider } from '../provider'
import { extractorTopic } from '../pubsub'

import { extractorSanitizerTopicSubscription } from './pubsub'

const extractorServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-extractor-sa`,
  {
    accountId: `${tag}-extractor`,
    displayName: 'Extractor Job Service Account',
  },
  { provider }
)

export const extractorRawArchiveBucketViewer = new gcp.storage.BucketIAMMember(
  `${tag}-extractor-raw-archive-bucket-viewer`,
  {
    bucket: rawArchiveBucketName,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${extractorServiceAccount.email}`,
  },
  { provider }
)

export const extractorStagingBucketCreator = new gcp.storage.BucketIAMMember(
  `${tag}-extractor-staging-bucket-creator`,
  {
    bucket: stagingBucket.name,
    role: 'roles/storage.objectCreator',
    member: pulumi.interpolate`serviceAccount:${extractorServiceAccount.email}`,
  },
  { provider }
)

export const extractorSanitizerTopicSubscriber =
  new gcp.pubsub.SubscriptionIAMMember(
    `${tag}-extractor-sanitizer-topic-subscriber`,
    {
      subscription: extractorSanitizerTopicSubscription.name,
      role: 'roles/pubsub.subscriber',
      member: pulumi.interpolate`serviceAccount:${extractorServiceAccount.email}`,
    },
    { provider }
  )

export const extractorTopicPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-extractor-topic-publisher`,
  {
    topic: extractorTopic.name,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${extractorServiceAccount.email}`,
  },
  { provider }
)

// If an extractor image is specified in config, use that. Otherwise, fall back to a public sample image.
function getExtractorImageUri(tag?: string): pulumi.Output<string> {
  if (!tag) {
    console.warn(
      'No extractorTag specified in config, using public sample image.'
    )
    return pulumi.output('gcr.io/google-samples/hello-app:1.0')
  }

  const image = gcp.artifactregistry.getDockerImageOutput(
    {
      location: artifactRegistry.location,
      repositoryId: artifactRegistry.repositoryId,
      imageName: `apps-extractor:${tag}`,
    },
    { provider }
  )

  return image.selfLink
}

export const extractorJob = new gcp.cloudrunv2.Job(
  `${tag}-extractor-job`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      template: {
        maxRetries: 0,
        serviceAccount: extractorServiceAccount.email,
        containers: [
          {
            image: getExtractorImageUri(dockerTag),
            envs: [
              {
                name: 'PUBSUB_SUBSCRIPTION_ID',
                value: extractorSanitizerTopicSubscription.id,
              },
              {
                name: 'MESSAGE_BATCH_SIZE',
                value: '1000',
              },
              {
                name: 'PUBSUB_TOPIC_NAME',
                value: extractorTopic.name,
              },
              {
                name: 'STORAGE_BUCKET_NAME',
                value: stagingBucket.name,
              },
              {
                name: 'MAX_CONCURRENCY',
                value: '10',
              },
              {
                name: 'LOG_LEVEL',
                value: 'error',
              },
            ],
          },
        ],
      },
    },
  },
  {
    dependsOn: [
      cloudRunService,
      extractorRawArchiveBucketViewer,
      extractorStagingBucketCreator,
      extractorTopicPublisher,
    ],
    provider,
  }
)
