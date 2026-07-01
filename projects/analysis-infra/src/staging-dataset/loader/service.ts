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

// import { archiveBucketName } from '../../../ingestion/archive'
import { stagingDataset, stagingFactChecksTable } from '../bigquery'

import {
  loaderServiceAccount,
  loaderStagingBucketViewer,
  loaderBigQueryJobUser,
  // loaderBigQueryDataEditor,
} from './service-account'

export const loaderService = new gcp.cloudrunv2.Service(
  `${tag}-staging-loader-service`,
  {
    location: gcpRegion,
    deletionProtection: false,
    template: {
      serviceAccount: loaderServiceAccount.email,
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
      cloudRunService,
      loaderStagingBucketViewer,
      loaderBigQueryJobUser,
      // loaderBigQueryDataEditor,
    ],
    provider,
  }
)
