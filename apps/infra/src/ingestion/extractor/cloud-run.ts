import * as gcp from '@pulumi/gcp'

import { gcpRegion, dockerTag, tag, logLevel } from '../config'
import { stagingBucket } from '../storage'
import { cloudRunService } from '../services'
import { provider } from '../provider'
import { extractorTopic } from '../pubsub'
import { getAppImageUri } from '../getImageUrl'
import { ingestionDataset } from '../big-query'

import {
  extractorServiceAccount,
  extractorRawArchiveBucketViewer,
  extractorSanitizerTopicSubscriber,
  extractorStagingBucketCreator,
  extractorTopicPublisher,
} from './service-account'
import { extractorSanitizerTopicSubscription } from './pubsub'

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
                value: ingestionDataset.datasetId,
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
