import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { gcpProject, tag } from '../../config'
import {
  provider,
  bigQueryDataTransferServiceAccountEmail,
} from '../../project'
import { stagingDatasetId } from '../../staging-dataset'

import { curatedDataset } from '../bigquery'

export const curatedLoaderServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-curated-dataset-loader-sa`,
  {
    accountId: `${tag}-curated-loader-sa`,
    displayName: 'Curated Dataset Loader (Analysis)',
  },
  { provider }
)

export const curatedLoaderDatasetViewer = new gcp.bigquery.DatasetIamMember(
  `${tag}-curated-loader-dataset-viewer`,
  {
    datasetId: stagingDatasetId,
    role: 'roles/bigquery.dataViewer',
    member: pulumi.interpolate`serviceAccount:${curatedLoaderServiceAccount.email}`,
  },
  { provider }
)

export const curatedLoaderDataEditor = new gcp.bigquery.DatasetIamMember(
  `${tag}-curated-loader-bigquery-data-editor`,
  {
    datasetId: curatedDataset.datasetId, // not stagingDataset.id
    role: 'roles/bigquery.dataEditor',
    member: pulumi.interpolate`serviceAccount:${curatedLoaderServiceAccount.email}`,
    project: gcpProject,
  },
  { provider }
)

export const curatedLoaderJobUser = new gcp.projects.IAMMember(
  `${tag}-curated-loader-bigquery-job-user`,
  {
    role: 'roles/bigquery.jobUser',
    member: pulumi.interpolate`serviceAccount:${curatedLoaderServiceAccount.email}`,
    project: gcpProject,
  },
  { provider }
)

export const bigQueryDataTransferTokenCreator =
  new gcp.serviceaccount.IAMMember(
    `${tag}-curated-loader-bigquery-data-transfer-user`,
    {
      serviceAccountId: curatedLoaderServiceAccount.name,
      role: 'roles/iam.serviceAccountTokenCreator',
      member: pulumi.interpolate`serviceAccount:${bigQueryDataTransferServiceAccountEmail}`,
    },
    { provider }
  )
