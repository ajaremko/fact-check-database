import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import {
  tableDeletionProtection,
  tag,
  analysisLabels,
  retainTablesOnDelete,
  gcpProject,
} from '../config'
import { provider } from '../project'

export const curatedDataset = new gcp.bigquery.Dataset(
  `${tag}-curated-dataset`,
  {
    datasetId: `${tag}_curated`,
    friendlyName: 'Analysis Curated Dataset',
    description: 'Dataset for curated, deduplicated data from staging',
    location: 'US',
  },
  { provider, retainOnDelete: retainTablesOnDelete }
)

export const curatedFactChecksTable = new gcp.bigquery.Table(
  `${tag}-curated-fact-checks-table`,
  {
    datasetId: curatedDataset.datasetId,
    tableId: 'fact_checks',
    deletionProtection: tableDeletionProtection,
    schema: JSON.stringify([
      { name: 'fact_check_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'fact_check_sha256', type: 'STRING', mode: 'REQUIRED' },
      { name: 'content_sha256', type: 'STRING', mode: 'REQUIRED' },
      { name: 'source_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'source_name', type: 'STRING', mode: 'REQUIRED' },
      { name: 'collection', type: 'STRING', mode: 'REQUIRED' },
      { name: 'fetched_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'extracted_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'extractor_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'extractor_version', type: 'STRING', mode: 'REQUIRED' },
      { name: 'url', type: 'STRING', mode: 'REQUIRED' },
      { name: 'final_url', type: 'STRING', mode: 'NULLABLE' },
      { name: 'canonical_url', type: 'STRING', mode: 'NULLABLE' },
      { name: 'language', type: 'STRING', mode: 'NULLABLE' },
      { name: 'title', type: 'STRING', mode: 'NULLABLE' },
      { name: 'summary', type: 'STRING', mode: 'NULLABLE' },
      { name: 'published_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
      { name: 'raw_published_at', type: 'STRING', mode: 'NULLABLE' },
    ]),
    timePartitioning: {
      type: 'MONTH',
      field: 'extracted_at',
    },
    labels: analysisLabels,
  },
  { provider, retainOnDelete: retainTablesOnDelete }
)

export const curatedTableRef = pulumi.interpolate`${gcpProject}.${curatedDataset.datasetId}.${curatedFactChecksTable.tableId}`
