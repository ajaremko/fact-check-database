import * as gcp from '@pulumi/gcp'

import { gcpProject as analysisGcpProject } from '../../analysis'

import { gcpRegion, dockerTag, tag, logLevel } from '../config'
import { cloudRunService } from '../services'
import { provider } from '../provider'
import { stagingBucket, rawArchiveBucket } from '../storage'
import { getAppImageUri } from '../getImageUrl'

import {
  loaderServiceAccount,
  loaderStagingBucketViewer,
  loaderBigQueryJobUser,
  loaderBigQueryDataEditor,
} from './service-account'

export const loaderService = new gcp.cloudrunv2.Service(
  `${tag}-loader-service`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      serviceAccount: loaderServiceAccount.email,
      containers: [
        {
          image: getAppImageUri('ingestion-pipeline-loader', dockerTag),
          envs: [
            {
              name: 'STORAGE_BUCKET_NAME',
              value: rawArchiveBucket.name,
            },
            {
              name: 'STAGING_BUCKET_NAME',
              value: stagingBucket.name,
            },
            {
              name: 'LOG_LEVEL',
              value: 'error',
            },
            {
              name: 'PINO_LOG_LEVEL',
              value: logLevel,
            },
            {
              name: 'SERVICE_NAME',
              value: 'loader-service',
            },
            {
              name: 'SERVICE_VERSION',
              value: dockerTag,
            },
            {
              name: 'GOOGLE_CLOUD_PROJECT',
              value: analysisGcpProject,
            },
          ],
        },
      ],
    },
  },
  {
    dependsOn: [
      cloudRunService,
      loaderStagingBucketViewer,
      loaderBigQueryJobUser,
      loaderBigQueryDataEditor,
    ],
    provider,
  }
)
