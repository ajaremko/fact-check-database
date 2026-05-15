import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { ingestionLabels, tag } from './config'
import { pubsubServiceAccountEmail } from './pubsub'

import {
  gcpRegion,
  retainStorageOnDelete,
  forceDestroyStorage,
  deadletterRetentionDays,
} from './config'
import { storageService, pubsubService } from './services'
import { provider } from './provider'

export const deadletterBucket = new gcp.storage.Bucket(
  `${tag}-deadletter-bucket`,
  {
    location: gcpRegion,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: 'enforced',
    forceDestroy: forceDestroyStorage,
    labels: ingestionLabels,
    lifecycleRules: deadletterRetentionDays
      ? [
          {
            action: { type: 'Delete' },
            condition: { age: deadletterRetentionDays },
          },
        ]
      : undefined,
  },
  {
    dependsOn: [storageService],
    retainOnDelete: retainStorageOnDelete,
    provider,
  }
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

/**
 * Creates a deadletter topic along with a subscription
 * that writes messages to the deadletter bucket.
 */
export function createDeadletterTopic(opts: {
  name: string
  cloudStorageConfig: pulumi.Input<
    Omit<gcp.types.input.pubsub.SubscriptionCloudStorageConfig, 'bucket'>
  >
  dependsOn?: pulumi.Input<pulumi.Resource>[]
}) {
  const dependsOn = typeof opts.dependsOn !== 'undefined' ? opts.dependsOn : []
  const topic = new gcp.pubsub.Topic(
    `${tag}-${opts.name}-topic`,
    { labels: ingestionLabels },
    { dependsOn: [pubsubService, ...dependsOn], provider }
  )
  const canPublish = new gcp.pubsub.TopicIAMMember(
    `${tag}-pubsub-sa-${opts.name}-publisher`,
    {
      topic: topic.name,
      role: 'roles/pubsub.publisher',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn }
  )
  const subscription = new gcp.pubsub.Subscription(
    `${tag}-${opts.name}-topic-log-subscription`,
    {
      topic: topic.name,
      cloudStorageConfig: {
        bucket: deadletterBucket.name,
        ...opts.cloudStorageConfig,
      },
      labels: ingestionLabels,
    },
    {
      dependsOn: [
        canPublish,
        // pubsubServiceAccountDeadletterSubscriber,
        pubsubServiceAccountDeadletterBucketReader,
        pubsubServiceAccountDeadletterObjectCreator,
        ...dependsOn,
      ],
      provider,
    }
  )
  return { topic, subscription }
}
