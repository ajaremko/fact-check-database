import * as gcp from '@pulumi/gcp'

import { tag, ingestionLabels } from './config'
import { provider } from './provider'

export const ingestionDataset = new gcp.bigquery.Dataset(
  `${tag}-dataset`,
  {
    datasetId: 'ingestion',
    friendlyName: 'News Research Dataset',
    description: 'Dataset for storing extracted claims and related data',
    location: 'US', // Regional location for data storage
  },
  { provider }
)

export const claimsTable = new gcp.bigquery.Table(
  `${tag}-claims-table`,
  {
    datasetId: ingestionDataset.datasetId,
    tableId: 'claims',
    deletionProtection: false,
    schema: JSON.stringify([
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
    ]),
    timePartitioning: {
      type: 'MONTH',
      field: 'extracted_at',
    },
    labels: ingestionLabels,
  },
  { provider }
)

export const ingestionDatasetId = ingestionDataset.datasetId
export const claimsTableId = claimsTable.tableId
