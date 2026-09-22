import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { archivePathPrefix } from '@fact-check-database/ingestion-contracts/archive/v1'

import { provider, gcsAccount } from '../project'
import { archiveBucketName } from '../archive'
import { createArchivedTopic } from '../shared'
import { tag } from '../config'

export const {
  topic: ingestorTopic,
  subscription: ingestorTopicArchiveSubscription,
} = createArchivedTopic({
  name: 'ingestor',
  archive: {
    cloudStorageConfig: {
      filenameDatetimeFormat: 'YYYY/MM/DD/hh_mm_ssZ',
      filenamePrefix: 'ingestor-events/',
      maxMessages: 1000,
    },
  },
})

const ingestorTopicGcsPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-ingestor-topic-publisher`,
  {
    topic: ingestorTopic.id,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${gcsAccount.emailAddress}`,
  },
  { provider }
)

export const ingestorStorageUploadNotification = new gcp.storage.Notification(
  `${tag}-ingestor-record-notification`,
  {
    bucket: archiveBucketName,
    payloadFormat: 'JSON_API_V1',
    topic: ingestorTopic.id,
    eventTypes: ['OBJECT_FINALIZE'],
    objectNamePrefix: archivePathPrefix('records/ingestion', 1),
  },
  {
    provider,
    dependsOn: [ingestorTopicGcsPublisher],
  }
)
