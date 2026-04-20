import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { rawArchiveBucketName } from '../../core'

import { tag } from '../config'
import { provider } from '../provider'
import { assetsBucket } from '../storage'
import { sanitizerTopic } from '../pubsub'

export const sanitizerServiceAccount = new gcp.serviceaccount.Account(
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
