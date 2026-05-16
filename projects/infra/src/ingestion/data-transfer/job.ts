import * as gcp from '@pulumi/gcp'

import { gcpRegion, dockerTag, tag, logLevel } from '../config'
import { cloudRunService } from '../services'
import { deadletterBucketName } from '../archive'
import { provider } from '../project'
import { getImageUrl } from '../pipeline/getImageUrl'
import { extractorTopicName } from '../pipeline'

import {
  dataTransferServiceAccount,
  dataTransferPubsubPublisher,
  dataTransferStorageAdmin,
} from './service-account'

export const dataTransferJob = new gcp.cloudrunv2.Job(
  `${tag}-data-transfer-job`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      template: {
        maxRetries: 0,
        serviceAccount: dataTransferServiceAccount.email,
        containers: [
          {
            image: getImageUrl('ingestion-pipeline-data-transfer', dockerTag),
            envs: [
              {
                name: 'GCS_BUCKET_NAME',
                value: deadletterBucketName,
              },
              {
                name: 'GCS_SOURCE_PATH',
                value: 'loader/extractor-events/**/*',
              },
              {
                name: 'GCS_DESTINATION_PATH',
                value: 'processed/loader/extractor-events/',
              },
              {
                name: 'PUBSUB_TOPIC_NAME',
                value: extractorTopicName,
              },
              {
                name: 'LOG_LEVEL',
                value: 'error',
              },
              {
                name: 'PINO_LOG_LEVEL',
                value: logLevel,
              },
              {
                name: 'SERVICE_NAME',
                value: 'data-transfer-job',
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
      dataTransferPubsubPublisher,
      dataTransferStorageAdmin,
    ],
    provider,
  }
)
