import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { artifactRegistry, rawArchiveBucketName } from '../../core'

import { gcpRegion, ingestorTag, tag } from '../config'
import { cloudRunService } from '../services'
import { provider } from '../provider'
import { assetsBucket } from '../storage'
import { ingestorTopic } from '../pubsub'

import { targetsObject } from './storage'

const ingestorServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-ingestion-sa`,
  {
    accountId: `${tag}-ingestor`,
    displayName: 'Ingestor Job Service Account',
  },
  { provider }
)

export const ingestorAssetBucketViewer = new gcp.storage.BucketIAMMember(
  `${tag}-ingestor-asset-bucket-viewer`,
  {
    bucket: assetsBucket.name,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)

export const ingestorRawArchiveBucketCreator = new gcp.storage.BucketIAMMember(
  `${tag}-ingestor-raw-archive-bucket-creator`,
  {
    bucket: rawArchiveBucketName,
    role: 'roles/storage.objectCreator',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)

export const ingestorTopicPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-ingestor-topic-publisher`,
  {
    topic: ingestorTopic.name,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${ingestorServiceAccount.email}`,
  },
  { provider }
)

// If an ingestor image is specified in config, use that. Otherwise, fall back to a public sample image.
function getIngestorImageUri(tag?: string): pulumi.Output<string> {
  if (!tag) {
    console.warn(
      'No ingestorTag specified in config, using public sample image.'
    )
    return pulumi.output('gcr.io/google-samples/hello-app:1.0')
  }

  const image = gcp.artifactregistry.getDockerImageOutput(
    {
      location: artifactRegistry.location,
      repositoryId: artifactRegistry.repositoryId,
      imageName: `apps-ingestor:${tag}`,
    },
    { provider }
  )

  return image.selfLink
}

export const ingestorJob = new gcp.cloudrunv2.Job(
  `${tag}-ingestor-job`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      template: {
        maxRetries: 0,
        serviceAccount: ingestorServiceAccount.email,
        containers: [
          {
            image: getIngestorImageUri(ingestorTag),
            envs: [
              {
                name: 'TARGET_LIST_BUCKET_NAME',
                value: assetsBucket.name,
              },
              {
                name: 'TARGET_LIST_URI',
                value: 'target-list.csv',
              },
              {
                name: 'PUBSUB_TOPIC_NAME',
                value: ingestorTopic.name,
              },
              {
                name: 'STORAGE_BUCKET_NAME',
                value: rawArchiveBucketName,
              },
              {
                name: 'MAX_CONCURRENCY',
                value: '10',
              },
              {
                name: 'SUCCESS_THRESHOLD',
                value: '0.8',
              },
              {
                name: 'LOG_LEVEL',
                value: 'info',
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
      targetsObject,
      ingestorAssetBucketViewer,
      ingestorRawArchiveBucketCreator,
      ingestorTopicPublisher,
    ],
    provider,
  }
)
