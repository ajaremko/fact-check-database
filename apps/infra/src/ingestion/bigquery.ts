import * as gcp from '@pulumi/gcp'

import { tag, ingestionLabels } from './config'
import { provider } from './provider'

export const stagingDataset = new gcp.bigquery.Dataset(
  `${tag}-staging-dataset`,
  {
    datasetId: 'staging',
    friendlyName: 'Staging Dataset',
    description: 'Dataset for staging extracted data',
    location: 'US', // Regional location for data storage
  },
  { provider }
)

export const stagingDatasetId = stagingDataset.datasetId

export const stagingFactChecksSchema = [
  { name: 'id', type: 'STRING', mode: 'REQUIRED' },
  { name: 'observation_id', type: 'STRING', mode: 'REQUIRED' },
  { name: 'ingestion_id', type: 'STRING', mode: 'REQUIRED' },
  { name: 'extraction_id', type: 'STRING', mode: 'REQUIRED' },
  { name: 'fetched_at', type: 'DATE', mode: 'REQUIRED' },
  { name: 'extracted_at', type: 'DATE', mode: 'REQUIRED' },
  { name: 'collection', type: 'STRING', mode: 'REQUIRED' },
  { name: 'source', type: 'STRING', mode: 'REQUIRED' },
  { name: 'url', type: 'STRING', mode: 'REQUIRED' },
  { name: 'final_url', type: 'STRING', mode: 'NULLABLE' },
  { name: 'published_at', type: 'STRING', mode: 'NULLABLE' },
  { name: 'title', type: 'STRING', mode: 'NULLABLE' },
  { name: 'claim', type: 'STRING', mode: 'NULLABLE' },
  { name: 'verdict', type: 'STRING', mode: 'NULLABLE' },
  { name: 'summary', type: 'STRING', mode: 'NULLABLE' },
]

export const stagingFactChecksTable = new gcp.bigquery.Table(
  `${tag}-staging-fact-checks-table`,
  {
    datasetId: stagingDataset.datasetId,
    tableId: 'fact-checks',
    deletionProtection: false,
    schema: JSON.stringify(stagingFactChecksSchema),
    timePartitioning: {
      type: 'MONTH',
      field: 'extracted_at',
    },
    labels: ingestionLabels,
  },
  { provider }
)

export const stagingFactChecksTableId = stagingFactChecksTable.tableId

export const curatedDataset = new gcp.bigquery.Dataset(
  `${tag}-curated-dataset`,
  {
    datasetId: 'curated',
    friendlyName: 'Curated Dataset',
    description: 'Dataset for curated data from staging',
    location: 'US',
  },
  { provider }
)

export const curatedDatasetId = curatedDataset.datasetId

export const curatedFactChecksSchema = [
  { name: 'id', type: 'STRING', mode: 'REQUIRED' },
  { name: 'observation_id', type: 'STRING', mode: 'REQUIRED' },
  { name: 'ingestion_id', type: 'STRING', mode: 'REQUIRED' },
  { name: 'extraction_id', type: 'STRING', mode: 'REQUIRED' },
  { name: 'fetched_at', type: 'DATE', mode: 'REQUIRED' },
  { name: 'extracted_at', type: 'DATE', mode: 'REQUIRED' },
  { name: 'collection', type: 'STRING', mode: 'REQUIRED' },
  { name: 'source', type: 'STRING', mode: 'REQUIRED' },
  { name: 'url', type: 'STRING', mode: 'REQUIRED' },
  { name: 'final_url', type: 'STRING', mode: 'NULLABLE' },
  { name: 'published_at', type: 'STRING', mode: 'NULLABLE' },
  { name: 'title', type: 'STRING', mode: 'NULLABLE' },
  { name: 'claim', type: 'STRING', mode: 'NULLABLE' },
  { name: 'verdict', type: 'STRING', mode: 'NULLABLE' },
  { name: 'summary', type: 'STRING', mode: 'NULLABLE' },
]

export const curatedFactChecksTable = new gcp.bigquery.Table(
  `${tag}-curated-fact-checks-table`,
  {
    datasetId: curatedDataset.datasetId,
    tableId: 'curated-fact-checks',
    deletionProtection: false,
    schema: JSON.stringify(stagingFactChecksSchema),
    timePartitioning: {
      type: 'MONTH',
      field: 'extracted_at',
    },
    labels: ingestionLabels,
  },
  { provider }
)

export const curatedFactChecksTableId = curatedFactChecksTable.tableId
