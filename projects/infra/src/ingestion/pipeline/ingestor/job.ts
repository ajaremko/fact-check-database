import * as gcp from '@pulumi/gcp'

import { gcpRegion, dockerTag, tag, logLevel } from '../../config'
import { assetsBucketName, ingestionSourcesObjectName } from '../../assets'
import { cloudRunService } from '../../services'
import { provider } from '../../project'
import { archiveBucketName } from '../../archive'

import { ingestorTopicName } from '../ingestor'
import { getImageUrl } from '../getImageUrl'

import {
  ingestorServiceAccount,
  ingestorAssetBucketViewer,
  ingestorRawArchiveBucketCreator,
  ingestorTopicPublisher,
  cloudtraceAgent,
} from './service-account'

export const ingestorJob = new gcp.cloudrunv2.Job(
  `${tag}-pipeline-ingestor-job`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      template: {
        maxRetries: 0,
        serviceAccount: ingestorServiceAccount.email,
        containers: [
          {
            image: getImageUrl('ingestion-pipeline-ingestor', dockerTag),
            envs: [
              {
                name: 'TARGET_LIST_BUCKET_NAME',
                value: assetsBucketName,
              },
              {
                name: 'TARGET_LIST_URI',
                value: ingestionSourcesObjectName,
              },
              {
                name: 'PUBSUB_TOPIC_NAME',
                value: ingestorTopicName,
              },
              {
                name: 'STORAGE_BUCKET_NAME',
                value: archiveBucketName,
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
                name: 'LOGGING_LEVEL',
                value: logLevel,
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
      ingestorAssetBucketViewer,
      ingestorRawArchiveBucketCreator,
      ingestorTopicPublisher,
      cloudtraceAgent,
    ],
    provider,
  }
)
