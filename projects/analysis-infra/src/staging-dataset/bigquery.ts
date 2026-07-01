import * as gcp from '@pulumi/gcp'

import { FactChecksTableDBSchema } from '@news-research/core-contracts'

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

export const stagingFactChecksTable = new gcp.bigquery.Table(
  `${tag}-staging-fact-checks-table`,
  {
    datasetId: stagingDataset.datasetId,
    tableId: 'fact_checks',
    deletionProtection: tableDeletionProtection,
    // note: changes in FactChecksTableSchema fields may not be detected by pulumi
    // needs further investigation
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
