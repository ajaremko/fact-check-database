import * as gcp from '@pulumi/gcp'

import { rawArchiveBucketName } from '../../core'

import { gcpRegion, dockerTag, tag, logLevel } from '../config'
import { cloudRunService } from '../services'
import { provider } from '../provider'
import { assetsBucket } from '../storage'
import { ingestorTopic } from '../pubsub'
import { getAppImageUri } from '../getImageUrl'

import {
  ingestorServiceAccount,
  ingestorAssetBucketViewer,
  ingestorRawArchiveBucketCreator,
  ingestorTopicPublisher,
  cloudtraceAgent,
} from './service-account'
import { targetsObject } from './storage'

export const ingestorJob = new gcp.cloudrunv2.Job(
  `${tag}-ingestor-job`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      template: {
        maxRetries: 0,
        serviceAccount: ingestorServiceAccount.email,
        containers: [
          {
            image: getAppImageUri('apps-ingestor', dockerTag),
            envs: [
              {
                name: 'TARGET_LIST_BUCKET_NAME',
                value: assetsBucket.name,
              },
              {
                name: 'TARGET_LIST_URI',
                value: targetsObject.name,
              },
              {
                name: 'PUBSUB_TOPIC_NAME',
                value: ingestorTopic.name,
              },
              {
                name: 'STORAGE_BUCKET_NAME',
                value: rawArchiveBucketName,
              },
              {
                name: 'MAX_CONCURRENCY',
                value: '10',
              },
              {
                name: 'SUCCESS_THRESHOLD',
                value: '0.8',
              },
              {
                name: 'PINO_LOG_LEVEL',
                value: logLevel,
              },
              {
                name: 'SERVICE_NAME',
                value: 'ingestor-job',
              },
              {
                name: 'SERVICE_VERSION',
                value: dockerTag,
              },
            ],
          },
        ],
      },
    },
  },
  {
    dependsOn: [
      cloudRunService,
      targetsObject,
      ingestorAssetBucketViewer,
      ingestorRawArchiveBucketCreator,
      ingestorTopicPublisher,
      cloudtraceAgent,
    ],
    provider,
  }
)
