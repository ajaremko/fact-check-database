import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, gcpRegion, dockerTag, tag, logLevel } from '../config'
import { cloudRunService } from '../services'
import { archiveBucketName } from '../archive'
import { provider } from '../project'
import { getImageUrl } from '../shared'
import { sanitizerTopicName } from '../sanitizer'

export const replayServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-archive-replay-sa`,
  {
    accountId: `${tag}-archive-replay-sa`,
    displayName: 'Archive Replay Service Account',
  },
  { provider }
)

export const replayStorageAdmin = new gcp.projects.IAMMember(
  `${tag}-archive-replay-storage-admin`,
  {
    role: 'roles/storage.admin',
    member: pulumi.interpolate`serviceAccount:${replayServiceAccount.email}`,
    project: gcpProject,
  },
  { provider }
)

export const replayPubsubPublisher = new gcp.projects.IAMMember(
  `${tag}-archive-replay-pubsub-publisher`,
  {
    role: 'roles/pubsub.publisher',
    member: pulumi.interpolate`serviceAccount:${replayServiceAccount.email}`,
    project: gcpProject,
  },
  { provider }
)

export const replayJob = new gcp.cloudrunv2.Job(
  `${tag}-archive-replay-job`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      template: {
        maxRetries: 0,
        serviceAccount: replayServiceAccount.email,
        containers: [
          {
            image: getImageUrl('ingestion-replay', dockerTag),
            envs: [
              {
                name: 'GCS_BUCKET_NAME',
                value: archiveBucketName,
              },
              {
                name: 'GCS_SOURCE_PATH',
                value: 'ingestor-events/**/*',
              },
              {
                name: 'GCS_DESTINATION_PATH',
                value: 'reprocessed/ingestor-events/',
              },
              {
                name: 'PUBSUB_TOPIC_NAME',
                value: sanitizerTopicName,
              },
              {
                name: 'LOGGING_LEVEL',
                value: 'info',
              },
              {
                name: 'PINO_LOG_LEVEL',
                value: logLevel,
              },
            ],
          },
        ],
      },
    },
  },
  {
    dependsOn: [cloudRunService, replayPubsubPublisher, replayStorageAdmin],
    provider,
  }
)
