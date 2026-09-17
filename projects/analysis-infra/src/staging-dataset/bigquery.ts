import * as gcp from '@pulumi/gcp'

import { FactChecksTableDBSchema } from '@news-research/core-contracts/staging/v1'

import {
  tableDeletionProtection,
  tag,
  analysisLabels,
  retainTablesOnDelete,
} from '../config'
import { provider } from '../project'

export const stagingDataset = new gcp.bigquery.Dataset(
  `${tag}-staging-dataset`,
  {
    datasetId: `${tag}_staging`,
    friendlyName: 'Analysis Staging Dataset',
    description: 'Dataset for staging extracted data',
    location: 'US', // Regional location for data storage
  },
  { provider, retainOnDelete: retainTablesOnDelete }
)

/**
 *  Type names from `FactChecksTableDBSchema` matter for deployment stability:
 * BigQuery reports `STRUCT` as `RECORD` and `INT64` as `INTEGER`. Pulumi does
 * not reliably detect changes inside nested `fields`, so schema changes need
 * a manual check of the deployed table.
 */
export const stagingFactChecksTable = new gcp.bigquery.Table(
  `${tag}-staging-fact-checks-table`,
  {
    datasetId: stagingDataset.datasetId,
    tableId: 'fact_checks',
    deletionProtection: tableDeletionProtection,
    schema: JSON.stringify(FactChecksTableDBSchema.fields),
    timePartitioning: {
      type: 'DAY',
      field: 'extracted_at',
      expirationMs: 7 * 1000 * 60 * 60 * 24, // 7 days in milliseconds
    },
    labels: analysisLabels,
  },
  { provider, retainOnDelete: retainTablesOnDelete }
)
