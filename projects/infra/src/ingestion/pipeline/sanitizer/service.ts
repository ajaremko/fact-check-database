import * as gcp from '@pulumi/gcp'

import { assetsBucketName, sanitizerPolicyObjectName } from '../../assets'
import { gcpRegion, dockerTag, tag, logLevel } from '../../config'
import { cloudRunService } from '../../services'
import { provider } from '../../project'
import { getImageUrl } from '../getImageUrl'
import { archiveBucketName } from '../../archive'

import { sanitizerTopic } from './topic'

import {
  sanitizerAssetBucketViewer,
  sanitizerRawArchiveBucketAdmin,
  sanitizerServiceAccount,
  sanitizerTopicPublisher,
} from './service-account'

export const sanitizerService = new gcp.cloudrunv2.Service(
  `${tag}-pipeline-sanitizer-service`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      serviceAccount: sanitizerServiceAccount.email,
      containers: [
        {
          image: getImageUrl('ingestion-pipeline-sanitizer', dockerTag),
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
      sanitizerTopicPublisher,
    ],
    provider,
  }
)
