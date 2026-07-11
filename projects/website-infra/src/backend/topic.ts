import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { provider, gcsAccount } from '../project'
import { tag, websiteLabels } from '../config'
import { pubsubService } from '../services'

import { backendBucket } from './storage'

export const formSubmissionTopic = new gcp.pubsub.Topic(
  `${tag}-form-submissions-topic`,
  { labels: websiteLabels },
  { dependsOn: [pubsubService], provider }
)

const formSubmissionTopicGcsPublisher = new gcp.pubsub.TopicIAMMember(
  `${tag}-form-submissions-topic-publisher`,
  {
    topic: formSubmissionTopic.id,
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${gcsAccount.emailAddress}`,
  },
  { provider }
)

export const formSubmissionStorageUploadNotification =
  new gcp.storage.Notification(
    `${tag}-form-submissions-record-notification`,
    {
      bucket: backendBucket.name,
      payloadFormat: 'JSON_API_V1',
      topic: formSubmissionTopic.id,
      eventTypes: ['OBJECT_FINALIZE'],
      objectNamePrefix: 'submissions/',
    },
    {
      provider,
      dependsOn: [formSubmissionTopicGcsPublisher],
    }
  )
