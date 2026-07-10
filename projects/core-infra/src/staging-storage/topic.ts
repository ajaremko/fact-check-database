import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { stagingPathPrefix } from '@news-research/core-contracts/staging/v1'

import { coreLabels, tag } from '../config'
import { provider, gcsAccount } from '../project'
import { pubsubService } from '../services'

import { factChecksTableDBSchemaObject } from './schema'
import { stagingStorageBucket } from './storage'

export const stagingStorageTopic = new gcp.pubsub.Topic(
  `${tag}-staging-uploads-topic`,
  { labels: coreLabels },
  { dependsOn: [pubsubService], provider }
)

const stagingUploadsTopicPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-staging-uploads-topic-publisher`,
  {
    topic: stagingStorageTopic.id,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${gcsAccount.emailAddress}`,
  },
  { provider }
)

export const stagingStorageUploadNofication = new gcp.storage.Notification(
  `${tag}-staging-uploads-notification`,
  {
    bucket: stagingStorageBucket.name,
    payloadFormat: 'JSON_API_V1',
    topic: stagingStorageTopic.id,
    eventTypes: ['OBJECT_FINALIZE'],
    objectNamePrefix: stagingPathPrefix('fact_checks', 1),
    customAttributes: {
      schemaObjectId: factChecksTableDBSchemaObject.name,
    },
  },
  {
    provider,
    dependsOn: [stagingUploadsTopicPublisher],
  }
)
