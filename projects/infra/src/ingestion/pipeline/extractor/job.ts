import * as gcp from '@pulumi/gcp'

import { stagingDatasetId } from '../../../analysis'
import { stagingBucketName } from '../../../core'

import { gcpRegion, dockerTag, tag, logLevel } from '../../config'
import { assetsBucketName } from '../../assets'
import { cloudRunService } from '../../services'
import { provider } from '../../project'
import { getImageUrl } from '../getImageUrl'

import {
  extractorServiceAccount,
  extractorRawArchiveBucketViewer,
  extractorSanitizerTopicSubscriber,
  extractorStagingBucketCreator,
  extractorTopicPublisher,
} from './service-account'
import { extractorTopic } from './topic'
import { extractorSubscription } from './subscription'

export const extractorJob = new gcp.cloudrunv2.Job(
  `${tag}-pipeline-extractor-job`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      template: {
        maxRetries: 0,
        serviceAccount: extractorServiceAccount.email,
        containers: [
          {
            image: getImageUrl('ingestion-pipeline-extractor', dockerTag),
            envs: [
              {
                name: 'ASSETS_BUCKET_NAME',
                value: assetsBucketName,
              },
              {
                name: 'PUBSUB_SUBSCRIPTION_ID',
                value: extractorSubscription.id,
              },
              {
                name: 'PUBSUB_TOPIC_NAME',
                value: extractorTopic.name,
              },
              {
                name: 'STORAGE_BUCKET_NAME',
                value: stagingBucketName,
              },
              {
                name: 'BIGQUERY_DATASET',
                value: stagingDatasetId,
              },
              {
                name: 'MESSAGE_BATCH_SIZE',
                value: '1000',
              },
              {
                name: 'MAX_CONCURRENCY',
                value: '10',
              },
              {
                name: 'LOGGING_LEVEL',
                value: logLevel,
              },
              {
                name: 'OTEL_CLOUD_MONITORING_PREFIX',
                value: 'workload.googleapis.com/pipeline/',
              },
              {
                name: 'OTEL_METRIC_EXPORT_INTERVAL',
                value: String(10_000),
              },
              {
                name: 'OTEL_SHUTDOWN_TIMEOUT',
                value: String(60_000),
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
