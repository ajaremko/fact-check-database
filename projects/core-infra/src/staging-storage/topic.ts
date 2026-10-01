import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { stagingPathPrefix } from '@fact-check-database/core-contracts/staging/v1'

import { coreLabels, tag } from '../config'
import { provider } from '../project'
import { pubsubService, storageService } from '../services'

import { factChecksTableDBSchemaObject } from './schema'
import { stagingStorageBucket } from './storage'

const gcsAccount = gcp.storage.getProjectServiceAccountOutput(
  {},
  { provider, dependsOn: [storageService] }
)

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
    // The trailing slash matters: GCS matches prefixes as literal strings,
    // so without it any sibling type such as `v1/type=fact_checks_<x>/`
    // would also notify the loaders, which can only load batch files.
    objectNamePrefix: `${stagingPathPrefix('fact_checks', 1)}/`,
    customAttributes: {
      schemaObjectId: factChecksTableDBSchemaObject.name,
    },
  },
  {
    provider,
    dependsOn: [stagingUploadsTopicPublisher],
  }
)
