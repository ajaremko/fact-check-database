import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { ingestionLabels, tag } from '../config'
import { provider, pubsubServiceAccountEmail } from '../project'
import { archiveDeadletterBucketName } from '../archive'
import { pubsubService } from '../services'

export const pubsubServiceAccountDeadletterBucketReader =
  new gcp.storage.BucketIAMMember(
    `${tag}-pubsub-sa-deadletter-bucket-reader`,
    {
      bucket: archiveDeadletterBucketName,
      role: 'roles/storage.legacyBucketReader',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn: [pubsubService] }
  )

export const pubsubServiceAccountDeadletterObjectCreator =
  new gcp.storage.BucketIAMMember(
    `${tag}-pubsub-sa-deadletter-object-creator`,
    {
      bucket: archiveDeadletterBucketName,
      role: 'roles/storage.objectCreator',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider, dependsOn: [pubsubService] }
  )

/**
 * Creates an archived subscription along with a deadletter topic
 * and a deadletter topic subscription that writes messages to the
 * deadletter bucket.
 */
export function createDeadletteredSubscription(opts: {
  name: string
  topic: pulumi.Input<string>
  ackDeadlineSeconds?: pulumi.Input<number>
  retryPolicy?: pulumi.Input<gcp.types.input.pubsub.SubscriptionRetryPolicy>
  pushConfig?: pulumi.Input<gcp.types.input.pubsub.SubscriptionPushConfig>
  archive: {
    messageRetentionDuration?: pulumi.Input<string>
    cloudStorageConfig: pulumi.Input<
      Omit<gcp.types.input.pubsub.SubscriptionCloudStorageConfig, 'bucket'>
    >
  }
  dependsOn?: pulumi.Input<pulumi.Resource>[]
}) {
  const dependsOn = typeof opts.dependsOn !== 'undefined' ? opts.dependsOn : []

  // create the deadletter topic to write failed messages to
  const deadletterTopic = new gcp.pubsub.Topic(
    `${tag}-${opts.name}-deadletter-topic`,
    { labels: ingestionLabels },
    { dependsOn: [pubsubService, ...dependsOn], provider }
  )

  // grant the pubsub service account permissions to publish
  // to the deadletter topic
  const pubsubServiceAccountPublisher = new gcp.pubsub.TopicIAMMember(
    `${tag}-pubsub-sa-${opts.name}-deadletter-topic-publisher`,
    {
      topic: deadletterTopic.name,
      role: 'roles/pubsub.publisher',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider }
  )

  // create the subscription with a deadletter policy that
  // sends failed messages to the deadletter topic
  const subscription = new gcp.pubsub.Subscription(
    `${tag}-${opts.name}-topic-subscription`,
    {
      topic: opts.topic,
      deadLetterPolicy: {
        deadLetterTopic: deadletterTopic.id,
        maxDeliveryAttempts: 5,
      },
      ackDeadlineSeconds: opts.ackDeadlineSeconds,
      retryPolicy: opts.retryPolicy,
      pushConfig: opts.pushConfig,
      labels: ingestionLabels,
    },
    { provider, dependsOn: [pubsubServiceAccountPublisher, ...dependsOn] }
  )

  // grant the pubsub service account permissions to access
  // the subscription
  const pubsubServiceAccountSubscriber = new gcp.pubsub.SubscriptionIAMMember(
    `${tag}-pubsub-sa-${opts.name}-topic-subscription-subscriber`,
    {
      subscription: subscription.name,
      role: 'roles/pubsub.subscriber',
      member: pulumi.interpolate`serviceAccount:${pubsubServiceAccountEmail}`,
    },
    { provider }
  )

  // create a subscription to the deadletter topic that
  // writes messages to the deadletter bucket once
  // all permissions are in place
  const archiveSubscription = new gcp.pubsub.Subscription(
    `${tag}-${opts.name}-deadletter-topic-archive-subscription`,
    {
      topic: deadletterTopic.name,
      messageRetentionDuration: opts.archive.messageRetentionDuration,
      cloudStorageConfig: {
        bucket: archiveDeadletterBucketName,
        ...opts.archive.cloudStorageConfig,
      },
      labels: ingestionLabels,
    },
    {
      dependsOn: [
        ...dependsOn,
        pubsubServiceAccountPublisher,
        pubsubServiceAccountSubscriber,
        pubsubServiceAccountDeadletterBucketReader,
        pubsubServiceAccountDeadletterObjectCreator,
      ],
      provider,
    }
  )
  return {
    subscription,
    deadletterTopic,
    archiveSubscription,
  }
}
