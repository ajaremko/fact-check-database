import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { artifactRegistry, rawArchiveBucketName } from '../../core'

import { gcpRegion, dockerTag, tag } from '../config'
import { cloudRunService } from '../services'
import { provider } from '../provider'
import { assetsBucket } from '../storage'
import { sanitizerTopic } from '../pubsub'

import { policyObject } from './storage'

const sanitizerServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-sanitizer-sa`,
  {
    accountId: `${tag}-sanitizer`,
    displayName: 'Sanitizer Service Account',
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

export const sanitizerTopicPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-sanitizer-topic-publisher`,
  {
    topic: sanitizerTopic.name,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
  },
  { provider }
)

// If an sanitizer image is specified in config, use that. Otherwise, fall back to a public sample image.
function getSanitizerImageUri(tag?: string): pulumi.Output<string> {
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

export const sanitizerService = new gcp.cloudrunv2.Service(
  `${tag}-sanitizer-service`,
  {
    location: gcpRegion,
    deletionProtection: false,
    launchStage: 'BETA',
    template: {
      serviceAccount: sanitizerServiceAccount.email,
      containers: [
        {
          image: getSanitizerImageUri(dockerTag),
          envs: [
            {
              name: 'ASSETS_BUCKET_NAME',
              value: assetsBucket.name,
            },
            {
              name: 'SANITIZER_POLICY_URI',
              value: policyObject.name,
            },
            {
              name: 'PUBSUB_TOPIC_NAME',
              value: sanitizerTopic.name,
            },
            {
              name: 'STORAGE_BUCKET_NAME',
              value: rawArchiveBucketName,
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
  {
    dependsOn: [
      cloudRunService,
      policyObject,
      sanitizerAssetBucketViewer,
      sanitizerRawArchiveBucketAdmin,
      // sanitizerIngestorTopicSubscriber,
      sanitizerTopicPublisher,
    ],
    provider,
  }
)
