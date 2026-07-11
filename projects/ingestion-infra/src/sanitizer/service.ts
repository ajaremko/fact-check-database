import * as gcp from '@pulumi/gcp'

import { assetsBucketName, sanitizerPolicyObjectName } from '../assets'
import { gcpRegion, dockerTag, tag, logLevel } from '../config'
import { cloudRunService } from '../services'
import { provider } from '../project'
import { getImageUrl } from '../shared'
import { archiveBucketName } from '../archive'
import { cloudRunArtifactRegistryReader } from '../iam'

import {
  sanitizerAssetBucketViewer,
  sanitizerRawArchiveBucketAdmin,
  sanitizerServiceAccount,
} from './service-account'
import { sanitizerTopic } from './topic'

export const sanitizerService = new gcp.cloudrunv2.Service(
  `${tag}-sanitizer-service`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      serviceAccount: sanitizerServiceAccount.email,
      containers: [
        {
          image: getImageUrl('ingestion-sanitizer', dockerTag),
          envs: [
            {
              name: 'ASSETS_BUCKET_NAME',
              value: assetsBucketName,
            },
            {
              name: 'SANITIZER_POLICY_URI',
              value: sanitizerPolicyObjectName,
            },
            {
              name: 'PUBSUB_TOPIC_NAME',
              value: sanitizerTopic.name,
            },
            {
              name: 'STORAGE_BUCKET_NAME',
              value: archiveBucketName,
            },
            {
              name: 'LOGGING_LEVEL',
              value: logLevel,
            },
            {
              name: 'OTEL_CLOUD_MONITORING_PREFIX',
              value: 'workload.googleapis.com/pipeline/',
            },
          ],
        },
      ],
    },
  },
  {
    dependsOn: [
      cloudRunService,
      sanitizerAssetBucketViewer,
      sanitizerRawArchiveBucketAdmin,
      cloudRunArtifactRegistryReader,
    ],
    provider,
  }
)
