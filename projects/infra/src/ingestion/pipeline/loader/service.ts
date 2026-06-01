import * as gcp from '@pulumi/gcp'

import { analysisGcpProject } from '../../../analysis'
import { stagingBucketName } from '../../../core'

import { gcpRegion, dockerTag, tag, logLevel } from '../../config'
import { cloudRunService } from '../../services'
import { provider } from '../../project'
import { archiveBucketName } from '../../archive'
import { getImageUrl } from '../getImageUrl'

import {
  loaderServiceAccount,
  loaderStagingBucketViewer,
  loaderBigQueryJobUser,
  loaderBigQueryDataEditor,
} from './service-account'

export const loaderService = new gcp.cloudrunv2.Service(
  `${tag}-pipeline-loader-service`,
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
              name: 'LOGGING_LEVEL',
              value: logLevel,
            },
            {
              name: 'GOOGLE_CLOUD_PROJECT',
              value: analysisGcpProject,
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
      loaderStagingBucketViewer,
      loaderBigQueryJobUser,
      loaderBigQueryDataEditor,
    ],
    provider,
  }
)
