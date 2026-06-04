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

const algoliaBigQueryIntegratorRole = new gcp.projects.IAMCustomRole(
  `${tag}-algolia-bigquery-integrator-role`,
  {
    roleId: `websiteAlgoliaBigQueryIntegrator`,
    title: 'Algolia BigQuery Integrator',
    description: 'A custom role for Algolia BigQuery integration',
    permissions: [
      'bigquery.datasets.get',
      'bigquery.datasets.getIamPolicy',
      'bigquery.jobs.create',
      'bigquery.models.export',
      'bigquery.models.getData',
      'bigquery.models.getMetadata',
      'bigquery.models.list',
      'bigquery.routines.get',
      'bigquery.routines.list',
      'bigquery.tables.createSnapshot',
      'bigquery.tables.export',
      'bigquery.tables.get',
      'bigquery.tables.getData',
      'bigquery.tables.getIamPolicy',
      'bigquery.tables.list',
      'resourcemanager.projects.get',
      'storage.folders.get',
      'storage.objects.get',
      'storage.objects.list',
    ],
  },
  { provider }
)

export const algoliaBigQueryIntegrator = new gcp.projects.IAMMember(
  `${tag}-algolia-bigquery-integrator`,
  {
    project: gcpProject,
    role: algoliaBigQueryIntegratorRole.name,
    member: pulumi.interpolate`serviceAccount:${algoliaServiceAccount.email}`,
  },
  { provider }
)
