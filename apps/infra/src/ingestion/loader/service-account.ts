import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag } from '../config'
import { provider } from '../provider'
import { stagingBucket } from '../storage'
import { ingestionDataset } from '../big-query'

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

export const loaderBigQueryDataCreator = new gcp.bigquery.DatasetIamMember(
  `${tag}-loader-bigquery-data-creator`,
  {
    datasetId: ingestionDataset.datasetId,
    role: 'roles/bigquery.dataEditor',
    member: pulumi.interpolate`serviceAccount:${loaderServiceAccount.email}`,
  },
  { provider }
)
