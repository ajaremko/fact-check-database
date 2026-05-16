import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { assetsBucketName } from '../../assets'
import { provider } from '../../project'
import { archiveBucketName } from '../../archive'
import { tag } from '../../config'

import { sanitizerTopic } from './topic'

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
    bucket: assetsBucketName,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${sanitizerServiceAccount.email}`,
  },
  { provider }
)

export const sanitizerRawArchiveBucketAdmin = new gcp.storage.BucketIAMMember(
  `${tag}-sanitizer-raw-archive-bucket-admin`,
  {
    bucket: archiveBucketName,
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
