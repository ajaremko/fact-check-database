import * as gcp from '@pulumi/gcp'

import { sourceListSecretId, sourceListSecretVersionNumber } from '../assets'
import { gcpRegion, dockerTag, tag, logLevel } from '../config'
import { cloudRunService } from '../services'
import { provider } from '../project'
import { archiveBucketName } from '../archive'
import { getImageUrl } from '../shared'
import { cloudRunArtifactRegistryReader } from '../iam'

import {
  ingestorServiceAccount,
  ingestorServiceAccountIamBindings,
} from './service-account'
import { ingestorTopic } from './topic'

export const ingestorJob = new gcp.cloudrunv2.Job(
  `${tag}-ingestor-job`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      template: {
        maxRetries: 0,
        volumes: [
          {
            name: 'source-config-volume',
            secret: {
              secret: sourceListSecretId,
              items: [
                {
                  version: sourceListSecretVersionNumber,
                  path: 'sources.csv',
                },
              ],
            },
          },
        ],
        serviceAccount: ingestorServiceAccount.email,
        containers: [
          {
            image: getImageUrl('ingestion-ingestor', dockerTag),
            volumeMounts: [
              {
                name: 'source-config-volume',
                mountPath: '/config',
              },
            ],
            envs: [
              {
                name: 'TARGET_LIST_PATH',
                value: '/config/sources.csv',
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
      cloudRunArtifactRegistryReader,
      ...ingestorServiceAccountIamBindings,
    ],
    provider,
  }
)
