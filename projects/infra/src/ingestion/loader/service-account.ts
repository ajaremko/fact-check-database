import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { stagingDatasetId } from '../../analysis'

import { gcpProject, tag } from '../config'
import { provider } from '../provider'
import { stagingBucket } from '../storage'

export const loaderServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-loader-sa`,
  {
    accountId: `${tag}-loader-sa`,
    displayName: 'Loader Service Account',
  },
  { provider }
)

export const loaderStagingBucketViewer = new gcp.storage.BucketIAMMember(
  `${tag}-loader-staging-bucket-viewer`,
  {
    bucket: stagingBucket.name,
    role: 'roles/storage.objectViewer',
    member: pulumi.interpolate`serviceAccount:${loaderServiceAccount.email}`,
  },
  { provider }
)

export const loaderBigQueryDataEditor = new gcp.bigquery.DatasetIamMember(
  `${tag}-loader-bigquery-data-editor`,
  {
    datasetId: stagingDatasetId,
    role: 'roles/bigquery.dataEditor',
    member: pulumi.interpolate`serviceAccount:${loaderServiceAccount.email}`,
    project: gcpProject,
  },
  { provider }
)

export const loaderBigQueryJobUser = new gcp.projects.IAMMember(
  `${tag}-loader-bigquery-job-user`,
  {
    role: 'roles/bigquery.jobUser',
    member: pulumi.interpolate`serviceAccount:${loaderServiceAccount.email}`,
    project: gcpProject,
  },
  { provider }
)
