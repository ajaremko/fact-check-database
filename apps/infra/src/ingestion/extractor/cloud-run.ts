import * as gcp from '@pulumi/gcp'

import { gcpRegion, dockerTag, tag, logLevel } from '../config'
import { assetsBucket, stagingBucket } from '../storage'
import { cloudRunService } from '../services'
import { provider } from '../provider'
import { extractorTopic } from '../pubsub'
import { getAppImageUri } from '../getImageUrl'
import { stagingDataset } from '../bigquery'

import {
  extractorServiceAccount,
  extractorRawArchiveBucketViewer,
  extractorSanitizerTopicSubscriber,
  extractorStagingBucketCreator,
  extractorTopicPublisher,
} from './service-account'
import { extractorSanitizerTopicSubscription } from './pubsub'
import { stagingFactChecksSchemaObject } from './storage'

export const extractorJob = new gcp.cloudrunv2.Job(
  `${tag}-extractor-job`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      template: {
        maxRetries: 0,
        serviceAccount: extractorServiceAccount.email,
        containers: [
          {
            image: getAppImageUri('apps-extractor', dockerTag),
            envs: [
              {
                name: 'ASSETS_BUCKET_NAME',
                value: assetsBucket.name,
              },
              {
                name: 'CLAIMS_SCHEMA_URI',
                value: stagingFactChecksSchemaObject.name,
              },
              {
                name: 'PUBSUB_SUBSCRIPTION_ID',
                value: extractorSanitizerTopicSubscription.id,
              },
              {
                name: 'MESSAGE_BATCH_SIZE',
                value: '1000',
              },
              {
                name: 'PUBSUB_TOPIC_NAME',
                value: extractorTopic.name,
              },
              {
                name: 'STORAGE_BUCKET_NAME',
                value: stagingBucket.name,
              },
              {
                name: 'BIGQUERY_DATASET',
                value: stagingDataset.datasetId,
              },
              {
                name: 'MAX_CONCURRENCY',
                value: '10',
              },
              {
                name: 'PINO_LOG_LEVEL',
                value: logLevel,
              },
              {
                name: 'SERVICE_NAME',
                value: 'extractor-job',
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
      extractorRawArchiveBucketViewer,
      extractorStagingBucketCreator,
      extractorSanitizerTopicSubscriber,
      extractorTopicPublisher,
    ],
    provider,
  }
)
