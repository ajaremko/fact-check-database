import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  dockerTag,
  stagingStorageBucketName,
  tag,
  logLevel,
} from '../config'
import { assetsBucketName } from '../assets'
import { cloudRunService } from '../services'
import { provider } from '../project'
import { getImageUrl } from '../shared'
import { cloudRunArtifactRegistryReader } from '../iam'

import {
  extractorServiceAccount,
  extractorRawArchiveBucketViewer,
  extractorSanitizerTopicSubscriber,
  stagingStorageBucketCreator,
} from './service-account'
import { extractorSubscription } from './subscription'

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
            image: getImageUrl('ingestion-extractor', dockerTag),
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
                name: 'STORAGE_BUCKET_NAME',
                value: stagingStorageBucketName,
              },
              {
                name: 'MESSAGE_BATCH_SIZE',
                value: '100',
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
      stagingStorageBucketCreator,
      extractorSanitizerTopicSubscriber,
      cloudRunArtifactRegistryReader,
    ],
    provider,
  }
)
