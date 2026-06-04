import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { ingestionLabels, tag } from '../config'
import { provider, pubsubServiceAccountEmail } from '../project'
import { eventLogBucketName } from '../archive'
import { pubsubService } from '../services'

export const pubsubServiceAccountEventLogBucketReader =
  new gcp.storage.BucketIAMMember(
    `${tag}-pubsub-sa-event-log-bucket-reader`,
    {
      bucket: eventLogBucketName,
      role: 'roles/storage.legacyBucketReader',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn: [pubsubService] }
  )

export const pubsubServiceAccountEventLogObjectCreator =
  new gcp.storage.BucketIAMMember(
    `${tag}-pubsub-sa-event-log-object-creator`,
    {
      bucket: eventLogBucketName,
      role: 'roles/storage.objectCreator',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn: [pubsubService] }
  )

/**
 * Creates an archived topic along with a subscription
 * that writes messages to the event log bucket.
 */
export function createArchivedTopic(opts: {
  name: string
  archive: {
    messageRetentionDuration?: pulumi.Input<string>
    cloudStorageConfig: pulumi.Input<
      Omit<gcp.types.input.pubsub.SubscriptionCloudStorageConfig, 'bucket'>
    >
  }
  dependsOn?: pulumi.Input<pulumi.Resource>[]
}) {
  const dependsOn = typeof opts.dependsOn !== 'undefined' ? opts.dependsOn : []

  // create the topic
  const topic = new gcp.pubsub.Topic(
    `${tag}-${opts.name}-topic`,
    { labels: ingestionLabels },
    { dependsOn: [pubsubService, ...dependsOn], provider }
  )

  // grant the pubsub service account permissions to publish to the topic
  const canPublish = new gcp.pubsub.TopicIAMMember(
    `${tag}-pubsub-sa-${opts.name}-publisher`,
    {
      topic: topic.name,
      role: 'roles/pubsub.publisher',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn }
  )

  // create a subscription that writes messages to the event log bucket
  const subscription = new gcp.pubsub.Subscription(
    `${tag}-${opts.name}-archive-subscription`,
    {
      topic: topic.name,
      messageRetentionDuration: opts.archive.messageRetentionDuration,
      cloudStorageConfig: {
        bucket: eventLogBucketName,
        ...opts.archive.cloudStorageConfig,
      },
      labels: ingestionLabels,
    },
    {
      dependsOn: [
        canPublish,
        // pubsubServiceAccountEventLogSubscriber,
        pubsubServiceAccountEventLogBucketReader,
        pubsubServiceAccountEventLogObjectCreator,
        ...dependsOn,
      ],
      provider,
    }
  )

  return { topic, subscription }
}
