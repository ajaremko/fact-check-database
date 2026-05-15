import * as gcp from '@pulumi/gcp'

import { rawArchiveBucketName } from '../../core'

import { gcpRegion, dockerTag, tag, logLevel } from '../config'
import { cloudRunService } from '../services'
import { provider } from '../provider'
import { assetsBucket } from '../storage'
import { sanitizerTopic } from '../pubsub'
import { getAppImageUri } from '../getImageUrl'

import {
  sanitizerAssetBucketViewer,
  sanitizerRawArchiveBucketAdmin,
  sanitizerServiceAccount,
  sanitizerTopicPublisher,
} from './service-account'
import { policyObject } from './storage'

export const sanitizerService = new gcp.cloudrunv2.Service(
  `${tag}-sanitizer-service`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      serviceAccount: sanitizerServiceAccount.email,
      containers: [
        {
          image: getAppImageUri('ingestion-pipeline-sanitizer', dockerTag),
          envs: [
            {
              name: 'ASSETS_BUCKET_NAME',
              value: assetsBucket.name,
            },
            {
              name: 'SANITIZER_POLICY_URI',
              value: policyObject.name,
            },
            {
              name: 'PUBSUB_TOPIC_NAME',
              value: sanitizerTopic.name,
            },
            {
              name: 'STORAGE_BUCKET_NAME',
              value: rawArchiveBucketName,
            },
            {
              name: 'PINO_LOG_LEVEL',
              value: logLevel,
            },
            {
              name: 'SERVICE_NAME',
              value: 'sanitizer-service',
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
  {
    dependsOn: [
      cloudRunService,
      policyObject,
      sanitizerAssetBucketViewer,
      sanitizerRawArchiveBucketAdmin,
      sanitizerTopicPublisher,
    ],
    provider,
  }
)
