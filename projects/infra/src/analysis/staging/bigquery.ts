import * as gcp from '@pulumi/gcp'

import { FactChecksTableSchema } from '@news-research/ingestion-pipeline/extract/contracts/v1'

import {
  tableDeletionProtection,
  tag,
  analysisLabels,
  retainTablesOnDelete,
} from '../config'
import { provider } from '../provider'

export const stagingDataset = new gcp.bigquery.Dataset(
  `${tag}-staging-dataset`,
  {
    datasetId: 'staging',
    friendlyName: 'Staging Dataset',
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
    schema: JSON.stringify(FactChecksTableSchema.fields),
    timePartitioning: {
      type: 'DAY',
      field: 'extracted_at',
      expirationMs: 7 * 1000 * 60 * 60 * 24, // 7 days in milliseconds
    },
    labels: analysisLabels,
  },
  { provider, retainOnDelete: retainTablesOnDelete }
)
