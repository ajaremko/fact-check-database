import * as gcp from '@pulumi/gcp'

import {
  gcpRegion,
  gcpProject,
  dockerTag,
  stagingStorageBucketName,
  tag,
  logLevel,
} from '../../config'
import { provider } from '../../project'
import { cloudRunService } from '../../services'
import { getImageUrl } from '../../getImageUrl'
import { cloudRunArtifactRegistryReader } from '../../iam'

import { stagingDataset, stagingFactChecksTable } from '../bigquery'

import {
  stagingDatasetLoaderServiceAccount,
  stagingDatasetLoaderStagingBucketViewer,
  stagingDatasetLoaderBigQueryJobUser,
  stagingDatasetLoaderBigQueryDataEditor,
} from './service-account'

export const loaderService = new gcp.cloudrunv2.Service(
  `${tag}-staging-loader-service`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      serviceAccount: stagingDatasetLoaderServiceAccount.email,
      containers: [
        {
          image: getImageUrl('analysis-loader', dockerTag),
          envs: [
            {
              name: 'PROJECT_ID',
              value: gcpProject,
            },
            {
              name: 'BIGQUERY_DATASET',
              value: stagingDataset.datasetId,
            },
            {
              name: 'BIGQUERY_TABLE',
              value: stagingFactChecksTable.tableId,
            },
            {
              name: 'STAGING_BUCKET_NAME',
              value: stagingStorageBucketName,
            },
            {
              name: 'LOGGING_LEVEL',
              value: logLevel,
            },
            {
              name: 'GOOGLE_CLOUD_PROJECT',
              value: gcpProject,
            },
            {
              name: 'OTEL_CLOUD_MONITORING_PREFIX',
              value: `workload.googleapis.com/${tag}/`,
            },
          ],
        },
      ],
    },
  },
  {
    dependsOn: [
      cloudRunArtifactRegistryReader,
      cloudRunService,
      stagingDatasetLoaderServiceAccount,
      stagingDatasetLoaderStagingBucketViewer,
      stagingDatasetLoaderBigQueryJobUser,
      stagingDatasetLoaderBigQueryDataEditor,
    ],
    provider,
  }
)
