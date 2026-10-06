import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import {
  tableDeletionProtection,
  tag,
  analysisLabels,
  retainTablesOnDelete,
  gcpProject,
} from '../config'
import {
  bigQueryEncryption,
  bigQueryServiceAgentKmsBinding,
} from '../encryption'
import { provider } from '../project'

export const curatedDataset = new gcp.bigquery.Dataset(
  `${tag}-curated-dataset`,
  {
    datasetId: `${tag}_curated`,
    friendlyName: 'Analysis Curated Dataset',
    description: 'Dataset for curated, deduplicated data from staging',
    location: 'US',
    // New tables in this dataset are encrypted with the customer-managed key
    // unless they name another one
    defaultEncryptionConfiguration: bigQueryEncryption,
  },
  {
    provider,
    retainOnDelete: retainTablesOnDelete,
    dependsOn: [bigQueryServiceAgentKmsBinding],
  }
)

export const curatedFactChecksTable = new gcp.bigquery.Table(
  `${tag}-curated-fact-checks-table`,
  {
    datasetId: curatedDataset.datasetId,
    tableId: 'fact_checks',
    deletionProtection: tableDeletionProtection,
    encryptionConfiguration: bigQueryEncryption,
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
      { name: 'sanitizer_policy_version', type: 'INTEGER', mode: 'NULLABLE' },
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
  {
    provider,
    retainOnDelete: retainTablesOnDelete,
    // BigQuery must be able to use the key before it can create the table
    dependsOn: [bigQueryServiceAgentKmsBinding],
    // A table's key is fixed when it is created, so changing it replaces
    // the table. The table id is fixed too, so the old table has to go
    // before its replacement can take the name.
    deleteBeforeReplace: true,
  }
)

export const curatedTableRef = pulumi.interpolate`${gcpProject}.${curatedDataset.datasetId}.${curatedFactChecksTable.tableId}`
