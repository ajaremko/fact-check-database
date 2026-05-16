import * as gcp from '@pulumi/gcp'

import { gcpProject as analysisGcpProject } from '../../../analysis'

import { gcpRegion, dockerTag, tag, logLevel } from '../../config'
import { cloudRunService } from '../../services'
import { provider } from '../../project'
import { stagingBucketName } from '../../staging'
import { archiveBucketName } from '../../archive'
import { getImageUrl } from '../getImageUrl'

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
          image: getImageUrl('ingestion-pipeline-loader', dockerTag),
          envs: [
            {
              name: 'STORAGE_BUCKET_NAME',
              value: archiveBucketName,
            },
            {
              name: 'STAGING_BUCKET_NAME',
              value: stagingBucketName,
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
              name: 'LOGGING_LEVEL',
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
