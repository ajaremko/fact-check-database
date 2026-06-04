import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { martsDatasetId } from '../../research'

import { tag, gcpProject } from '../config'
import { provider } from '../project'

export const algoliaServiceAccount = new gcp.serviceaccount.Account(
  `${tag}-algolia-integration-sa`,
  {
    accountId: `${tag}-algolia-integration-sa`,
    displayName: 'Algolia Integration Job Service Account',
  },
  { provider }
)

export const algoliaBigQueryDataViewer = new gcp.bigquery.DatasetIamMember(
  `${tag}-algolia-bigquery-data-viewer`,
  {
    datasetId: martsDatasetId,
    role: 'roles/bigquery.dataViewer',
    member: pulumi.interpolate`serviceAccount:${algoliaServiceAccount.email}`,
    project: gcpProject,
  },
  { provider }
)
