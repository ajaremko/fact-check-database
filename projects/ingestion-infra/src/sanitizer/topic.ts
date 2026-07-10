import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { archivePathPrefix } from '@news-research/ingestion-contracts/archive/v1'

import { provider, gcsAccount } from '../project'
import { archiveBucketName } from '../archive'
import { createArchivedTopic } from '../shared'
import { tag } from '../config'

export const {
  topic: sanitizerTopic,
  subscription: sanitizerTopicArchiveSubscription,
} = createArchivedTopic({
  name: 'sanitizer',
  archive: {
    cloudStorageConfig: {
      filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
      filenamePrefix: 'sanitizer-events/',
      maxMessages: 1000,
    },
  },
})

const sanitizerTopicGcsPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-sanitizer-topic-publisher`,
  {
    topic: sanitizerTopic.id,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${gcsAccount.emailAddress}`,
  },
  { provider }
)

export const sanitizerStorageUploadNotification = new gcp.storage.Notification(
  `${tag}-sanitizer-record-notification`,
  {
    bucket: archiveBucketName,
    payloadFormat: 'JSON_API_V1',
    topic: sanitizerTopic.id,
    eventTypes: ['OBJECT_FINALIZE'],
    objectNamePrefix: archivePathPrefix('records/sanitizer', 1),
  },
  {
    provider,
    dependsOn: [sanitizerTopicGcsPublisher],
  }
)
