import * as gcp from '@pulumi/gcp'

import { gcpRegion, dockerTag, tag, logLevel } from '../config'
import { assetsBucketName, ingestionSourcesObjectName } from '../assets'
import { cloudRunService } from '../services'
import { provider } from '../project'
import { archiveBucketName } from '../archive'
import { getImageUrl } from '../shared'
import { cloudRunArtifactRegistryReader } from '../iam'

import { ingestorTopic } from './topic'

import {
  ingestorServiceAccount,
  ingestorAssetBucketViewer,
  ingestorRawArchiveBucketCreator,
  cloudtraceAgent,
} from './service-account'

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
            image: getImageUrl('ingestion-ingestor', dockerTag),
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
                value: ingestorTopic.name,
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
              {
                name: 'OTEL_CLOUD_MONITORING_PREFIX',
                value: 'workload.googleapis.com/pipeline/',
              },
              {
                name: 'OTEL_METRIC_EXPORT_INTERVAL',
                value: String(10_000),
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
      cloudtraceAgent,
      cloudRunArtifactRegistryReader,
    ],
    provider,
  }
)
