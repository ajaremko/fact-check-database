import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import {
  artifactRegistry,
  rawArchiveBucketName,
  observationsTopicName,
} from '../../core'

import { gcpRegion, sanitizerTag, tag } from '../config'
import { cloudRunService } from '../services'
import { provider } from '../provider'
import { assetsBucket } from '../storage'

import { policiesObject } from './storage'

const sanitizerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-sanitizer-sa`,
  {
    accountId: `${tag}-sanitizer`,
    displayName: 'Sanitizer Worker Service Account',
  },
  { provider }
)

export const sanitizerAssetBucketViewer = new gcp.storage.BucketIAMMember(
  `${tag}-sanitizer-asset-bucket-viewer`,
  {
    bucket: assetsBucket.name,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
  },
  { provider }
)

export const sanitizerRawArchiveBucketAdmin = new gcp.storage.BucketIAMMember(
  `${tag}-sanitizer-raw-archive-bucket-admin`,
  {
    bucket: rawArchiveBucketName,
    role: 'roles/storage.objectAdmin',
    member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
  },
  { provider }
)

export const sanitizerObservationsTopicSubscriber =
  new gcp.pubsub.TopicIAMMember(
    `${tag}-sanitizer-observations-topic-subscriber`,
    {
      topic: observationsTopicName,
      role: 'roles/pubsub.subscriber',
      member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
    },
    { provider }
  )

// If an sanitizer image is specified in config, use that. Otherwise, fall back to a public sample image.
function getsanitizerImageUri(tag?: string): pulumi.Output<string> {
  if (!tag) {
    console.warn(
      'No sanitizerTag specified in config, using public sample image.'
    )
    return pulumi.output('gcr.io/google-samples/hello-app:1.0')
  }

  const image = gcp.artifactregistry.getDockerImageOutput(
    {
      location: artifactRegistry.location,
      repositoryId: artifactRegistry.repositoryId,
      imageName: `apps-sanitizer:${tag}`,
    },
    { provider }
  )

  return image.selfLink
}

export const sanitizerWorker = new gcp.cloudrunv2.WorkerPool(
  `${tag}-sanitizer-worker`,
  {
    location: gcpRegion,
    deletionProtection: false,
    launchStage: 'BETA',
    template: {
      serviceAccount: sanitizerServiceAccount.email,
      containers: [
        {
          image: getsanitizerImageUri(sanitizerTag),
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
              value: observationsTopicName,
            },
            {
              name: 'ARCHIVE_BUCKET_NAME',
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
  {
    dependsOn: [
      cloudRunService,
      policiesObject,
      sanitizerAssetBucketViewer,
      sanitizerRawArchiveBucketAdmin,
      sanitizerObservationsTopicSubscriber,
    ],
    provider,
  }
)
