import * as gcp from '@pulumi/gcp'
import * as pulumi from '@pulumi/pulumi'

import { tag, ingestionLabels, gcpProject } from './config'
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
  { name: 'content_lineage_id', type: 'STRING', mode: 'REQUIRED' },
  { name: 'extracted_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
  { name: 'fetched_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
  { name: 'ingestion_id', type: 'STRING', mode: 'REQUIRED' },
  { name: 'extraction_id', type: 'STRING', mode: 'REQUIRED' },
  {
    name: 'source',
    type: 'STRUCT',
    mode: 'NULLABLE',
    fields: [
      { name: 'id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'collection', type: 'STRING', mode: 'REQUIRED' },
      { name: 'name', type: 'STRING', mode: 'REQUIRED' },
      { name: 'url', type: 'STRING', mode: 'REQUIRED' },
    ],
  },
  {
    name: 'fact_check',
    type: 'STRUCT',
    mode: 'REQUIRED',
    fields: [
      { name: 'sha256', type: 'STRING', mode: 'NULLABLE' },
      { name: 'title', type: 'STRING', mode: 'NULLABLE' },
      { name: 'claim', type: 'STRING', mode: 'NULLABLE' },
      { name: 'verdict', type: 'STRING', mode: 'NULLABLE' },
      { name: 'summary', type: 'STRING', mode: 'NULLABLE' },
      { name: 'published_at', type: 'STRING', mode: 'NULLABLE' },
      { name: 'canonical_url', type: 'STRING', mode: 'NULLABLE' },
      { name: 'language', type: 'STRING', mode: 'NULLABLE' },
      { name: 'normalized_verdict', type: 'STRING', mode: 'NULLABLE' },
      { name: 'extractor_version', type: 'STRING', mode: 'NULLABLE' },
      { name: 'extracted_from', type: 'STRING', mode: 'NULLABLE' },
    ],
  },
  {
    name: 'http',
    type: 'STRUCT',
    mode: 'REQUIRED',
    fields: [
      { name: 'content_sha256', type: 'STRING', mode: 'REQUIRED' },
      { name: 'final_url', type: 'STRING', mode: 'NULLABLE' },
      { name: 'status_code', type: 'INT64', mode: 'NULLABLE' },
      { name: 'etag', type: 'STRING', mode: 'NULLABLE' },
      { name: 'content_type', type: 'STRING', mode: 'NULLABLE' },
      { name: 'last_modified', type: 'STRING', mode: 'NULLABLE' },
      { name: 'headers', type: 'JSON', mode: 'NULLABLE' },
    ],
  },
]

export const stagingFactChecksTable = new gcp.bigquery.Table(
  `${tag}-staging-fact-checks-table`,
  {
    datasetId: stagingDataset.datasetId,
    tableId: 'fact-checks',
    deletionProtection: false,
    schema: JSON.stringify(stagingFactChecksSchema),
    timePartitioning: {
      type: 'DAY',
      field: 'extracted_at',
      expirationMs: 7 * 1000 * 60 * 60 * 24, // 7 days in milliseconds
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

export const curatedFactChecksTable = new gcp.bigquery.Table(
  `${tag}-curated-fact-checks-table`,
  {
    datasetId: curatedDataset.datasetId,
    tableId: 'fact-checks',
    deletionProtection: false,
    schema: JSON.stringify([
      { name: 'fact_check_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'content_lineage_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'content_sha256', type: 'STRING', mode: 'REQUIRED' },
      { name: 'source_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'source_name', type: 'STRING', mode: 'REQUIRED' },
      { name: 'collection', type: 'STRING', mode: 'REQUIRED' },
      { name: 'url', type: 'STRING', mode: 'REQUIRED' },
      { name: 'final_url', type: 'STRING', mode: 'NULLABLE' },
      { name: 'canonical_url', type: 'STRING', mode: 'NULLABLE' },
      { name: 'title', type: 'STRING', mode: 'NULLABLE' },
      { name: 'claim', type: 'STRING', mode: 'NULLABLE' },
      { name: 'summary', type: 'STRING', mode: 'NULLABLE' },
      { name: 'verdict_raw', type: 'STRING', mode: 'NULLABLE' },
      { name: 'normalized_verdict', type: 'STRING', mode: 'NULLABLE' },
      { name: 'language', type: 'STRING', mode: 'NULLABLE' },
      { name: 'published_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
      { name: 'fetched_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'extracted_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'extractor_version', type: 'STRING', mode: 'NULLABLE' },
      { name: 'http_status_code', type: 'INT64', mode: 'NULLABLE' },
    ]),
    timePartitioning: {
      type: 'MONTH',
      field: 'extracted_at',
    },
    labels: ingestionLabels,
  },
  { provider }
)

export const curatedFactChecksTableId = curatedFactChecksTable.tableId

const curatedTableRef = pulumi.interpolate`${gcpProject}.${curatedDataset.datasetId}.${curatedFactChecksTable.tableId}`
const stagingTableRef = pulumi.interpolate`${gcpProject}.${stagingDataset.datasetId}.${stagingFactChecksTable.tableId}`

export const stagingToCuratedTransferJob = new gcp.bigquery.DataTransferConfig(
  `${tag}-staging-to-curated-transfer-job`,
  {
    displayName: 'Curated Fact Checks Transfer Job',
    dataSourceId: 'scheduled_query',
    location: 'US',
    schedule: 'every 6 hours',
    params: {
      query: pulumi.interpolate`
        MERGE \`${curatedTableRef}\` T
        USING (
          SELECT
            TO_HEX(SHA256(CONCAT(
              source.id,
              IFNULL(fact_check.canonical_url, source.url),
              fact_check.sha256
            ))) AS fact_check_id,
            content_lineage_id,
            content_sha256,
            source.id AS source_id,
            source.name AS source_name,
            source.collection,
            source.url,
            http.final_url,
            fact_check.canonical_url,
            fact_check.title,
            fact_check.claim,
            fact_check.summary,
            fact_check.verdict AS verdict_raw,
            fact_check.normalized_verdict,
            fact_check.language,
            TIMESTAMP(fact_check.published_at) AS published_at,
            fetched_at,
            extracted_at,
            fact_check.extractor_version,
            http.status_code AS http_status_code
          FROM \`${stagingTableRef}\`
          WHERE extracted_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR)
        ) S
        ON T.fact_check_id = S.fact_check_id`,
    },
  },
  { provider }
)
