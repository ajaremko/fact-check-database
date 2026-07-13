import * as gcp from '@pulumi/gcp'

import {
  sanitizerPolicySecretId,
  sanitizerPolicySecretVersionNumber,
} from '../assets'
import { gcpRegion, dockerTag, tag, logLevel } from '../config'
import { cloudRunService } from '../services'
import { provider } from '../project'
import { getImageUrl } from '../shared'
import { archiveBucketName } from '../archive'
import { cloudRunArtifactRegistryReader } from '../iam'

import {
  sanitizerServiceAccount,
  sanitizerServiceAccountIamBindings,
} from './service-account'
import { sanitizerTopic } from './topic'

export const sanitizerService = new gcp.cloudrunv2.Service(
  `${tag}-sanitizer-service`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      serviceAccount: sanitizerServiceAccount.email,
      volumes: [
        {
          name: 'sanitizer-policy-config-volume',
          secret: {
            secret: sanitizerPolicySecretId,
            items: [
              {
                version: sanitizerPolicySecretVersionNumber,
                path: 'sanitizer-policy.yml',
              },
            ],
          },
        },
      ],
      containers: [
        {
          image: getImageUrl('ingestion-sanitizer', dockerTag),
          volumeMounts: [
            {
              name: 'sanitizer-policy-config-volume',
              mountPath: '/config',
            },
          ],
          envs: [
            {
              name: 'SANITIZER_POLICY_MODE',
              value: 'filesystem',
            },
            {
              name: 'SANITIZER_POLICY_PATH',
              value: '/config/sanitizer-policy.yml',
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
      cloudRunArtifactRegistryReader,
      ...sanitizerServiceAccountIamBindings,
    ],
    provider,
  }
)
